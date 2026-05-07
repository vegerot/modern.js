import type {
  HelmetData,
  HelmetDatum,
  HelmetHTMLBodyDatum,
  HelmetHTMLElementDatum,
} from 'react-helmet';
import { helmetReplace } from '../../src/core/server/helmet';

const createDatum = (value = ''): HelmetDatum => ({
  toString: () => value,
  toComponent: () => null as ReturnType<HelmetDatum['toComponent']>,
});

const createBodyDatum = (value = ''): HelmetHTMLBodyDatum => ({
  toString: () => value,
  toComponent: () => ({}),
});

const createHtmlDatum = (value = ''): HelmetHTMLElementDatum => ({
  toString: () => value,
  toComponent: () => ({}),
});

const helmetData: HelmetData = {
  bodyAttributes: createBodyDatum(),
  htmlAttributes: createHtmlDatum(),
  base: createDatum(),
  link: createDatum(),
  meta: createDatum(),
  noscript: createDatum(),
  script: createDatum(),
  style: createDatum(),
  title: createDatum(),
  titleAttributes: createDatum(),
};

describe('helmet', () => {
  it('should replace title', () => {
    const result = helmetReplace('<title>foo</title>', {
      ...helmetData,
      title: createDatum('<title>baz</title>'),
    });

    expect(result).toMatch('baz');
  });

  it('should insert base tag', () => {
    const result = helmetReplace('<head></head>', {
      ...helmetData,
      base: createDatum('<base href="https://example.com/" />'),
    });

    expect(result).toMatch('<base href="https://example.com/" />');
  });
});
