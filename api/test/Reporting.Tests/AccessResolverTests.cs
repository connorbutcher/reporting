using Reporting.Abstractions;
using Reporting.DAL.Permissions;
using Xunit;

namespace Reporting.Tests;

public class AccessResolverTests
{
    // --- helpers ----------------------------------------------------------

    private sealed record TestUser(int Id, bool IsGlobalAdmin = false, int[]? Groups = null) : ICurrentUser
    {
        public Guid RefId => Guid.Empty;
        public string DisplayName => "test";
        public IReadOnlyCollection<int> GroupIds => Groups ?? [];
    }

    private static GrantLine User(int id, AccessLevel level) => new(GrantSubjectType.User, id, level);
    private static GrantLine Group(int id, AccessLevel level) => new(GrantSubjectType.Group, id, level);
    private static GrantLine Everyone(AccessLevel level) => new(GrantSubjectType.Everyone, null, level);

    /// <summary>A node that inherits from <paramref name="parent"/>.</summary>
    private static SecurableNode Inheriting(SecurableNode? parent, params GrantLine[] grants) =>
        new(InheritsPermissions: true, grants, parent);

    /// <summary>A node that breaks inheritance — the chain stops here.</summary>
    private static SecurableNode Broken(SecurableNode? parent, params GrantLine[] grants) =>
        new(InheritsPermissions: false, grants, parent);

    /// <summary>The root scope, seeded open to everyone.</summary>
    private static SecurableNode OpenRoot() => new(InheritsPermissions: false, [Everyone(AccessLevel.Viewer)], null);

    // --- admin bypass -----------------------------------------------------

    [Fact]
    public void GlobalAdmin_isManagerEverywhere_evenWithNoGrants()
    {
        var node = Broken(null); // no grants, inheritance cut — nobody else gets in
        Assert.Equal(AccessLevel.Manager, AccessResolver.Resolve(new TestUser(1, IsGlobalAdmin: true), node));
    }

    // --- the open root baseline ------------------------------------------

    [Fact]
    public void EveryoneBaseline_atRoot_givesAnyUserViewer()
    {
        var folder = Inheriting(OpenRoot());
        Assert.Equal(AccessLevel.Viewer, AccessResolver.Resolve(new TestUser(7), folder));
    }

    // --- direct and group grants -----------------------------------------

    [Fact]
    public void DirectUserGrant_appliesToThatUserOnly()
    {
        var folder = Inheriting(OpenRoot(), User(1, AccessLevel.Manager));
        Assert.Equal(AccessLevel.Manager, AccessResolver.Resolve(new TestUser(1), folder));
        // A different user only has the root's Everyone→Viewer.
        Assert.Equal(AccessLevel.Viewer, AccessResolver.Resolve(new TestUser(2), folder));
    }

    [Fact]
    public void GroupGrant_matchesViaMembership()
    {
        var folder = Broken(null, Group(10, AccessLevel.Editor));
        Assert.Equal(AccessLevel.Editor, AccessResolver.Resolve(new TestUser(1, Groups: [10]), folder));
        Assert.Equal(AccessLevel.None, AccessResolver.Resolve(new TestUser(1, Groups: [11]), folder));
    }

    [Fact]
    public void MultipleMatchingGrants_takeTheHighestLevel()
    {
        // The user is a Viewer directly but an Editor through a group: Editor wins.
        var folder = Broken(null, User(1, AccessLevel.Viewer), Group(10, AccessLevel.Editor));
        Assert.Equal(AccessLevel.Editor, AccessResolver.Resolve(new TestUser(1, Groups: [10]), folder));
    }

    // --- additive inheritance --------------------------------------------

    [Fact]
    public void InheritedGrant_fromAnAncestor_appliesToDescendants()
    {
        var parent = Inheriting(OpenRoot(), Group(10, AccessLevel.Editor));
        var child = Inheriting(parent);
        var grandchild = Inheriting(child);
        Assert.Equal(AccessLevel.Editor, AccessResolver.Resolve(new TestUser(1, Groups: [10]), grandchild));
    }

    [Fact]
    public void ChildGrant_addsOnTopOfInheritedAccess()
    {
        var parent = Inheriting(OpenRoot(), User(1, AccessLevel.Viewer));
        var child = Inheriting(parent, User(1, AccessLevel.Manager));
        Assert.Equal(AccessLevel.Manager, AccessResolver.Resolve(new TestUser(1), child));
    }

    // --- break-inheritance: the restrictive-subtree requirement -----------

    [Fact]
    public void BrokenInheritance_cutsTheRootBaseline_makingTheSubtreePrivate()
    {
        // Root(Everyone→Viewer) ← "Engine Builds"(inherits) ← "Concessions"(BREAK; QA-Leads Manager, alice Viewer)
        var root = OpenRoot();
        var engineBuilds = Inheriting(root);
        var concessions = Broken(engineBuilds, Group(10, AccessLevel.Manager), User(1, AccessLevel.Viewer));

        var bob = new TestUser(2);                 // no explicit grant anywhere
        var alice = new TestUser(1);               // named on the folder
        var qaLead = new TestUser(3, Groups: [10]); // in QA-Leads

        // Bob is a Viewer on the open parent...
        Assert.Equal(AccessLevel.Viewer, AccessResolver.Resolve(bob, engineBuilds));
        // ...but the broken subfolder is invisible to him — stricter than its parent.
        Assert.Equal(AccessLevel.None, AccessResolver.Resolve(bob, concessions));

        Assert.Equal(AccessLevel.Viewer, AccessResolver.Resolve(alice, concessions));
        Assert.Equal(AccessLevel.Manager, AccessResolver.Resolve(qaLead, concessions));
    }

    [Fact]
    public void BrokenNode_stillHonoursItsOwnEveryoneGrant()
    {
        // A broken node can re-open itself explicitly; the cut only removes *inherited* access.
        var broken = Broken(OpenRoot(), Everyone(AccessLevel.Viewer));
        Assert.Equal(AccessLevel.Viewer, AccessResolver.Resolve(new TestUser(99), broken));
    }

    [Fact]
    public void BreakBelowAGrant_doesNotSeeThatGrant()
    {
        // Grant sits on the parent; the child breaks inheritance, so it doesn't inherit the grant.
        var parent = Inheriting(OpenRoot(), User(1, AccessLevel.Manager));
        var child = Broken(parent);
        Assert.Equal(AccessLevel.None, AccessResolver.Resolve(new TestUser(1), child));
    }

    // --- no access --------------------------------------------------------

    [Fact]
    public void NoMatchingGrantAnywhere_resolvesToNone()
    {
        var folder = Broken(null, User(5, AccessLevel.Manager));
        Assert.Equal(AccessLevel.None, AccessResolver.Resolve(new TestUser(1), folder));
    }
}
