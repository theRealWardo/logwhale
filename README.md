# LogWhale

A Kibana plugin for tailing logs from containers.


## Docker Container

In addition to publishing releases on GitHub, they are also on Docker Hub. The latest container available via:

```
docker pull therealwardo/kibana-logwhale:5.3.0
```


## Contributing and Development

If you want to contribute code, simply open a pull request. By opening a pull request, you agree that your code will be MIT licensed.

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md) for instructions setting up your development environment. The main tasks when developing the plugin are:

  - `npm start`

    Start kibana and have it include this plugin. This will automatically start dev mode which recompiles your code on refresh.

  - `npm start -- --config kibana.yml --no-ssl`

    You can pass any argument that you would normally send to `bin/kibana` by putting them after `--` when running `npm start`.

  - `npm run build`

    Build a distributable archive.

  - `npm run test:browser`

    Run the browser tests in a real web browser. (I couldn't actually get these to run...)

  - `npm run test:server`

    Run the server tests.

For more information about any of these commands run `npm run ${task} -- --help`.
