import { expect } from 'chai';
import { indexWithoutDate } from '../utils';

describe('indexWithoutDate', () => {
  it('does not modify index without a date', () => {
    expect(indexWithoutDate('index-1234')).to.equal('index-1234');
  });
  it('replaces date in index with a date', () => {
    expect(indexWithoutDate('index-2017.04.20')).to.equal('index-*');
  });
});
