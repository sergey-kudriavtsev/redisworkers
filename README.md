# REDIS WORKER QUEUE DEMO

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Build Status](https://travis-ci.org/joemccann/dillinger.svg?branch=master)]()

Task: implement a worker serving queue.

Worker has 2 states (generator, worker)
If there is no generator in the system, the worker enters the state of the generator.
the absence of a generator in the system does not exceed 10 seconds.
A generator fills the queue with tasks.
Worker solves the problem.

### Run Environment

***
1. ##### Clone repo
```sh
$ git clone git@github.com:sergey-kudriavtsev/redisworkers.git
$ cd ./redisworkers
$ npm install
```

2. ##### start docker
```sh
$ docker-compose up
```

2. ##### stop docker
```sh
docker-compose stop
```
