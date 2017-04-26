import flat from 'flat';

const messagesForClient = (resp, messageField, timestampField, tagMap) => {
  return resp.hits.hits.map((msg) => {
    let source = flat(msg._source);
    let message = {
      id: source['@uuid'],
      message: source[messageField],
      timestamp: source[timestampField],
    };
    Object.keys(tagMap).forEach((tag) => {
      message[tag] = source[tagMap[tag]];
    });
    return message;
  });
}

const dateRegexp = /[0-9]{4}\.[0-9]{2}\.[0-9]{2}/;

const indexWithoutDate = (index) => {
  let result = dateRegexp.exec(index);
  if (result) {
    return index.substr(0, result.index) + '*';
  }
  return index;
}

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

  /**
   *
   * /api/logwhale/indices
   *
   * {
   *   ok: true,
   *   indices: ["logstash-*"]
   * }
   *
   * Looks up all potentially queryable indices and returns them as a list.
   */
  server.route({
    path: '/api/logwhale/indices',
    method: 'GET',
    handler(req, reply) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      // h: 'i' => display just the index name
      // s: 'i:asc' => sort by the index name ascending
      callWithRequest(req, 'cat.indices', {h: 'i', s: 'i:asc'}).then(function (resp) {
        let indices = [];
        resp.split('\n').forEach((index) => {
          if (index.length > 0 && index[0] != '.') {
            let newIndex = indexWithoutDate(index);
            if (indices.indexOf(newIndex) < 0) {
              indices.push(newIndex);
            }
          }
        });
        reply({
          indices,
          ok: true,
        });
      }).catch(function (resp) {
        reply({
          resp,
          ok: false,
        });
      });
    }
  });

}
