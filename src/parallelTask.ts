/**
 * 并行执行任务的统一调度, 适用于一次性传入所有任务列表的情况
 * @param {*} tasks 任务队列，promise函数
 * @param {*} paralleNum 最大并行数量
 */
export type TaskItem = () => Promise<any>;

export function parallelTask(
  tasks: TaskItem[],
  paralleNum: number
): Promise<void> {
  return new Promise((resolve) => {
    if (tasks.length === 0) {
      resolve();
      return;
    }

    let nextIndex = 0;
    let finishCount = 0;
    function _run() {
      const task = tasks[nextIndex];
      nextIndex++;
      task().then(() => {
        finishCount++;
        if (nextIndex < tasks.length) {
          _run();
        } else if (finishCount === tasks.length) {
          resolve();
        }
      });
    }

    for (let i = 0; i < paralleNum && i < tasks.length; i++) {
      _run();
    }
  });
}

/**
 * 并行任务调度2，适用于动态增加任务（addTask）的情况
 */
export interface SuperItem {
  task: TaskItem;
  resolve: (value: any) => void;
  reject: () => void;
}

class SuperTask {
  parallelCount: number;
  runningCount: number;
  tasks: SuperItem[];
  //首先我们来定义一下需要的东西
  constructor(parallelCount = 2) {
    this.parallelCount = parallelCount; //并发数量
    this.runningCount = 0; //正在运行的任务数
    this.tasks = []; //任务队列
  }

  add(task: TaskItem): Promise<any> {
    return new Promise((resolve, reject) => {
      this.tasks.push({ task, resolve, reject });
      this._run();
    });
  }
  _run() {
    //依次执行队列里的所有任务，当然要满足我们的需求，当前任务的数量要小于并发数量
    while (this.runningCount < this.parallelCount && this.tasks.length) {
      const { task, resolve, reject } = this.tasks.shift();
      this.runningCount++;
      task()
        .then(resolve, reject)
        .finally(() => {
          this.runningCount--;
          this._run();
        });
    }
  }
}

export default SuperTask;
