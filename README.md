# npm-from-past

Run npm/yarn commands as if you were in the past. Useful if you lost a lock file
or need to install a dependency in a legacy project that hasn't been updated in a while.

## Install

```sh
npm install -g npm-from-past
```

## Usage as registry-server

Start registry server:

```sh
npm-from-past 2019-07-20 --server --port 10001
```

Use it with npm commands:

```sh
NPM_CONFIG_REGISTRY=http://localhost:10001 npm install
```

## Usage as command wrapper

Run `npm install` as if you were back in `2016-05-06`:

```sh
npm-from-past 2016-05-06 npm install redux
```

Check latest version which was at the time:

```sh
npm-from-past 2016-05-06 npm show redux version
```

Use any other npm-commands in the same way. If you have any troubles, try to switch to registry-server.
