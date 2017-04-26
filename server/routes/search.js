import { messagesForClient } from '../utils';

export default function (server) {

  /**
   *
   * /api/logwhale/search
   * {
   *   index: "logstash-*",
   *   maxRecords: 100,
   *   messageField: "@message",
   *   search: "query",
   *   tagFilters: {tagName: "valueForFiltering"},
   *   tagMap: {tagName: "@field"},
   *   timestampField: "@timestamp"
   * }
   *
   * {
   *   ok: true,
   *   messages: [
   *     {
   *       tag: "@fieldvalue",
   *       message: "@messagevalue",
   *       timestamp: "ISO-8601 time"
   *     },
   *     ...
   *   ]
   * }
   *
   * Searches through an index and assembles log messages for presentation.
   */
  server.route({
    path: '/api/logwhale/search',
    method: 'POST',
    handler(req, reply) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

      let search = req.payload.search;
      if (search == null || search.length === 0) {
        search = '*';
      }

      let esRequest = {
        index: req.payload.index,
        size: req.payload.maxRecords,
        body: {
          sort: [{}],
          query: {
            bool: {
              must: [
                {
                  query_string: {
                    analyze_wildcard: true,
                    default_field: req.payload.messageField,
                    query: search
                  }
                }
              ]
            }
          }
        }
      };
      // Set the timestamp sort field, because it has a dynamic key.
      esRequest.body.sort[0][req.payload.timestampField] = {order: 'desc'};
      // Append any additionally requested filters as term queries.
      Object.keys(req.payload.tagFilters).forEach((filter) => {
        let fieldName = req.payload.tagMap[filter];
        let field = fieldName.indexOf('.') > 0 ? fieldName + '.keyword' : fieldName;
        let value = req.payload.tagFilters[filter];
        let termQuery = { term: {} };
        termQuery.term[field] = { value };
        esRequest.body.query.bool.must.push(termQuery);
      });

      callWithRequest(req, 'search', esRequest).then(function (resp) {
        if (req.payload.raw) {
          reply({
            resp,
            ok: true,
          });
        } else {
          reply({
            messages: messagesForClient(resp, req.payload.messageField, req.payload.timestampField, req.payload.tagMap)
          });
        }
      }).catch(function (resp) {
        reply({
          resp,
          ok: false,
        });
      });
    }
  });

}
