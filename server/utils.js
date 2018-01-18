import flat from 'flat';

export const messagesForClient = (resp, messageField, timestampField, tagMap) => {
  return resp.hits.hits.map((msg) => {
    let source = flat(msg._source);
    let message = {
      id: source['@uuid'] || source['@realtime_timestamp'] || (source[messageField] + source[timestampField]),
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

export const indexWithoutDate = (index) => {
  let result = dateRegexp.exec(index);
  if (result) {
    return index.substr(0, result.index) + '*';
  }
  return index;
}
