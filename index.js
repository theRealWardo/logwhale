import { resolve } from 'path';
import exampleRoute from './server/routes/example';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],

    uiExports: {
      
      app: {
        title: 'Logwhale',
        description: 'Plugin to view, search &amp; tail logs from containers in Kibana.',
        main: 'plugins/logwhale/app'
      },
      
      
      translations: [
        resolve(__dirname, './translations/es.json')
      ],
      
      
      hacks: [
        'plugins/logwhale/hack'
      ]
      
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    
    init(server, options) {
      // Add server routes and initalize the plugin here
      exampleRoute(server);
    }
    

  });
};
