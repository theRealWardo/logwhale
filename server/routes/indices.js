import { indexWithoutDate } from '../utils';

export default function (server) {

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
