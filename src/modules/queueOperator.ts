const queueOperator = {
    enqueue: (queue: SpawnTask[], task: SpawnTask) => {
        queue.push(task);

        queue.sort((a, b) => {
            if (a.priority == undefined) {
                return -1;
            }
            if (b.priority == undefined) {
                return 1;
            }
            return a.priority - b.priority;
        });
    },

    dequeue: (queue: SpawnTask[]) => {
        return queue.pop();
    },

    enqueueGroup: (queue: SpawnTask[], tasks: SpawnTask[]) => {
        for (const task of tasks) {
            queueOperator.enqueue(queue, task);
        }
    }
}

export default queueOperator;