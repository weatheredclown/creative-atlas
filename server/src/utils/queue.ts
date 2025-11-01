type Job = () => Promise<void>;

const queue: Job[] = [];
let isProcessing = false;

const processQueue = async () => {
    if (isProcessing) return;
    isProcessing = true;

    while (queue.length > 0) {
        const job = queue.shift();
        if (job) {
            try {
                await job();
            } catch (error) {
                console.error('Error processing job:', error);
            }
        }
    }

    isProcessing = false;
};

export const addJob = (job: Job) => {
    queue.push(job);
    void processQueue();
};
