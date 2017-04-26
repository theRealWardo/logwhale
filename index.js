import { resolve } from 'path';
import searchRoute from './server/routes/search';
import indicesRoute from './server/routes/indices';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],

    uiExports: {
      app: {
        title: 'LogWhale',
        description: 'A Kibana plugin for tailing logs from containers.',
        main: 'plugins/logwhale/app',
        icon: 'plugins/logwhale/logo.svg'
      }
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) {
      searchRoute(server);
      indicesRoute(server);
    }
  });
};
