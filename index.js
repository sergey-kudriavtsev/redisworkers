

const {once} = require("events");
const Promise = require("bluebird");
const Redis = require("redis");
// promisify all method of redis cli
Promise.promisifyAll(Redis);

require("dotenv").config();

/*eslint computed-property-spacing: ["error", "never", { "enforceForClassMembers": true }]*/
/*eslint-env es6*/

/**
* Class - Redis Client
*/
class RedisCli {
  /*
  * Redis client
  * @private
  */
  #redis;

  #min = process.env.RANDOM_MIN || 1;
  #max = process.env.RANDOM_MAX || 10;

  constructor(host = process.env.REDIS_HOST || "localhost", port = process.env.REDIS_PORT || 6379) {
    // connecting to Redis
    this.#redis = Redis.createClient(port, host);

    // bind methods
    this.#redis.on("error", this.onError.bind(this));
    this.#redis.on("connect", this.onConnect.bind(this));
  }

  /**
  * Error handler
  * @virtual required
  * @return void
  */
  onError() {
    throw new Error("Method \"catchError\" not defined");
  }

  /**
  * Connection handler
  * @virtual optional
  * @return void
  */
  onConnect() {}

  /**
  * Getter - Redis client
  * @public
  * @return Object<RedisClient>
  */
  get redis() {
    return this.#redis;
  }

  /**
  * Getter - random number ranging from 1 to 10
  * @public
  * @return Number
  */
  get random() {
    const rand = this.#min + Math.random() * (this.#max + 1 - this.#min);
    return Math.floor(rand);
  }
}


/**
* Class - Worker
*/
class Worker extends RedisCli {

  #stateInterval = process.env.STATE_INTERVAL || 10000; // 10 sec
  #generatorInterval = process.env.GENERATOR_INTERVAL ||1000; //  1 sec
  #workerInterval = process.env.WORKER_INTERVAL ||5000; //  1 sec

  #id;
  #state = 0;

  #KEYS = {
    WORKERID: "#WORKERS_ID",
    GENERATOR: "#GENERATOR",
    QUEUE: "#QUEUE",
    ERROR: "#ERROR"
  };

  #STATE = ["WORKER", "GENERATOR"]

  /**
  * Getter - return worker name
  * @public
  * @return String
  */
  get name() {
    return `[Worker:${this.#id} state:${this.#STATE[this.#state]}]`;
  }

  /**
  * Error handler
  * @public
  * @return void
  */
  onError(error) {
    this.#state = 0;
    error.name = this.name;
    if(error.code !== "ECONNREFUSED") console.log(error);
  }

  /**
  * Connection handler
  * @public
  * @return void
  */
  onConnect() {
    this.initWorker();
  }

  /**
  * Initializing Worker instance
  * @public
  * @return void
  */
  async initWorker() {
    try {
      await this.setWorkerId();

      await this.checkMode();
      console.log(`${this.name} - start `);

      // use start us worker
      this.startWorker();
    } catch (e) {
      this.onError(e);
    }
  }

  /**
  * Setting Worker id
  * @public
  * @return void
  */
  async setWorkerId() {
    this.#id = await this.redis.incrAsync(this.#KEYS.WORKERID);
  }

  /**
  * Check Worker Mode(Status)
  * @describe checks for a generator in the system every 10 seconds
  * @public
  * @return void
  */
  async checkMode() {
    // stop flag
    if (!this.redis.ready) return;

    console.log(`${this.name} - check worker status`);

    if (await this.redis.setnxAsync(this.#KEYS.GENERATOR, this.#id)) {
      // set expire own time (mutually exclusive access)
      this.redis.pexpireAsync(this.#KEYS.GENERATOR, this.#stateInterval - 1);

      if (this.#state === 0) {
        // exchange own mode
        this.#state = 1;
        this.startGenerator();
        console.log(`${this.name} - exchange mode`);
      }
    } else if (this.#state === 1) {
      this.#state = 0;
      this.startWorker();
      console.log(`${this.name} - exchange mode`);
    }

    // check status every 10 sec
    setTimeout(this.checkMode.bind(this), this.#stateInterval);

  }

  /**
  * Reset Worker mode to generator
  * @describe performs generator tasks every 1 second
  * @public
  * @return void
  */
  async startGenerator() {
    // for old Task from event loop stack
    if (this.#state === 0 || !this.redis.ready) return;

    this.newTask();

    // reserve next task
    setTimeout(this.startGenerator.bind(this), (this.#generatorInterval));
  }

  /**
  * Task generator
  * @describe generates random value for task and sends to the system queues
  * @public
  * @return void
  */
  async newTask(){
    const value = this.random;
    console.log(`${this.name} - add Task:${value}`);
    this.redis.rpushAsync(this.#KEYS.QUEUE,value);
  }

  /**
  * Reset Worker mode to worker
  * @describe performs worker tasks every 5 second
  * @public
  * @return void
  */
  async startWorker() {
    // for old Task from event loop stack
    if (this.#state === 1 || !this.redis.ready) return;

    // check exists task
    this.runTask();

    setTimeout(this.startWorker.bind(this), this.#workerInterval);
  }

  /**
  * Task executor
  * @describe takes the first task out of the queue, solves the problem,
  *           writes the error log in case of incorrect calculations
  * @public
  * @return void
  */
  async runTask(){
    let task = await this.redis.rpopAsync(this.#KEYS.QUEUE);

    if(task){
      console.log(`${this.name} - run Task:${task}`);

      if (task > 8) await this.redis.rpushAsync(this.#KEYS.ERROR, `error: ${task} > 8`);

      //get next task
      process.nextTick(this.runTask.bind(this));
    }
  }
}


// run worker
new Worker();
