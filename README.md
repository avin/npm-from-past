# npm-from-past

Run npm/yarn commands as if you were in the past. Useful if you lost a lock file
or need to install a dependency in a legacy project that hasn't been updated in a while.

## Usage

Install:

```sh
npm install -g npm-from-past
```

Run `npm install` as if you were back in `2016-05-06`:

```sh
npm-from-past 2016-05-06 npm install redux
```

Check latest version which was at the time:

```sh
npm-from-past 2016-05-06 npm show redux version
```

Use any other npm-commands in the same way. 
