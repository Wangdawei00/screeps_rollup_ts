interface WorkTask{
    type: string;
    targetId: Id<ConstructionSite> | Id<Structure>;
    taken: boolean;
}