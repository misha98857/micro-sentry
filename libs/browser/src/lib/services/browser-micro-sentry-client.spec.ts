import { BrowserMicroSentryClient } from './browser-micro-sentry-client';
import { Severity } from '@micro-sentry/core';
import { MAX_BREADCRUMBS } from '../consts/max-breadcrumbs';

describe('BrowserMicroSentryClient', () => {
  let client: BrowserMicroSentryClient;
  const maxBreadcrumbs = 10;
  const getBreadcrumbs = (amount: number) =>
    [...Array(amount).keys()].map((index) => ({
      event_id: `id${index}`,
      type: 'console',
      level: Severity.critical,
    }));

  beforeAll(() => {
    client = new BrowserMicroSentryClient({
      dsn: 'http://secret@exampl.dsn/2',
      release: '1.0.0',
      maxBreadcrumbs,
    });
  });

  it('Client is created', () => {
    expect(client).toBeTruthy();
  });

  describe('Tags', () => {
    it('Method setTags sets tags', () => {
      client.setTags({ test: 'tag' });
      expect(client.state).toEqual({ tags: { test: 'tag' } });
    });

    it('Method setTags rewrite tags if there are', () => {
      client.setTags({ anotherTag: 'name' });
      expect(client.state).toEqual({ tags: { anotherTag: 'name' } });

      client.setTags({ someTag: 'awesome' });
      expect(client.state).toEqual({ tags: { someTag: 'awesome' } });
    });

    it('Method setTag expand existing tags', () => {
      client.setTags({ someTag: 'awesome' });
      client.setTag('tag', 'test');

      expect(client.state).toEqual({
        tags: { tag: 'test', someTag: 'awesome' },
      });
    });

    afterAll(() => {
      client.clearState();
    });
  });

  describe('Extra', () => {
    it('Method setExtras sets extra tags', () => {
      client.setExtras({ test: 'tag' });
      expect(client.state).toEqual({ extra: { test: 'tag' } });
    });

    it('Method setExtras rewrites extra tags if there are', () => {
      client.setExtras({ anotherTag: 'name' });
      expect(client.state).toEqual({ extra: { anotherTag: 'name' } });

      client.setExtras({ someTag: 'awesome' });
      expect(client.state).toEqual({ extra: { someTag: 'awesome' } });
    });

    it('Method setExtra расширяет существующие экстра теги', () => {
      client.setExtras({ someTag: 'awesome' });
      client.setExtra('tag', 'test');

      expect(client.state).toEqual({
        extra: { tag: 'test', someTag: 'awesome' },
      });
    });

    afterAll(() => {
      client.clearState();
    });
  });

  describe('Mix Tags Extras and User', () => {
    it('Methods setTag with setExtras set tags and extras', () => {
      client.setTags({ test: 'tag' });
      expect(client.state).toEqual({ tags: { test: 'tag' } });

      client.setExtras({ tag: 'test' });

      expect(client.state).toEqual({
        tags: { test: 'tag' },
        extra: { tag: 'test' },
      });
    });

    it('Methods setTag with setUser set tags and user', () => {
      client.setTags({ test: 'tag' });
      expect(client.state).toEqual({ tags: { test: 'tag' } });

      client.setUser({ username: 'test' });

      expect(client.state).toEqual({
        tags: { test: 'tag' },
        user: { username: 'test' },
      });
    });

    it('Methods setExtras with setTag set tags and extras', () => {
      client.setExtras({ tag: 'test' });
      expect(client.state).toEqual({ extra: { tag: 'test' } });

      client.setTags({ test: 'tag' });

      expect(client.state).toEqual({
        tags: { test: 'tag' },
        extra: { tag: 'test' },
      });
    });

    it('Methods setExtras with setUser set user and extras', () => {
      client.setExtras({ tag: 'test' });
      expect(client.state).toEqual({ extra: { tag: 'test' } });

      client.setUser({ username: 'test' });

      expect(client.state).toEqual({
        user: { username: 'test' },
        extra: { tag: 'test' },
      });
    });

    it('Methods setUser with setExtra set extras and user', () => {
      client.setUser({ username: 'test' });
      expect(client.state).toEqual({ user: { username: 'test' } });

      client.setExtras({ tag: 'test' });
      expect(client.state).toEqual({
        user: { username: 'test' },
        extra: { tag: 'test' },
      });
    });

    it('Methods setUser with setTag set tag and user', () => {
      client.setUser({ username: 'test' });
      expect(client.state).toEqual({ user: { username: 'test' } });

      client.setTags({ test: 'tag' });
      expect(client.state).toEqual({
        user: { username: 'test' },
        tags: { test: 'tag' },
      });
    });

    it('Methods setUser with setTags with setExtra work together', () => {
      client.setUser({ username: 'test' });
      expect(client.state).toEqual({ user: { username: 'test' } });

      client.setTags({ test: 'tag' });
      expect(client.state).toEqual({
        user: { username: 'test' },
        tags: { test: 'tag' },
      });

      client.setExtras({ tag: 'test' });
      expect(client.state).toEqual({
        user: { username: 'test' },
        tags: { test: 'tag' },
        extra: { tag: 'test' },
      });
    });

    it('Should clear user on setUser(null)', () => {
      client.setUser({ username: 'test' });

      client.setUser(null);

      expect(client.state.user).toBeUndefined();
    });

    afterEach(() => {
      client.clearState();
    });

    it('Should override release version', () => {
      client.setRelease('1.1.1');

      expect(client.release).toEqual('1.1.1');
    });
  });

  describe('Breadcrumbs', () => {
    it('Method addBreadcrumb adds them', () => {
      client.addBreadcrumb({
        event_id: 'id',
        type: 'console',
        level: Severity.critical,
      });

      client.addBreadcrumb({
        event_id: 'id2',
        type: 'console',
        level: Severity.critical,
      });

      expect(client.state).toEqual({
        breadcrumbs: [
          {
            event_id: 'id',
            type: 'console',
            level: 'critical',
            timestamp: expect.any(Number),
          },
          {
            event_id: 'id2',
            type: 'console',
            level: 'critical',
            timestamp: expect.any(Number),
          },
        ],
      });
    });

    it('should limit breadcrumbs amount - with custom limit; incremental addition', () => {
      getBreadcrumbs(maxBreadcrumbs + 2).forEach((bc) =>
        client.addBreadcrumb(bc)
      );

      expect(client.state.breadcrumbs?.length).toBe(maxBreadcrumbs);
    });

    it('should limit breadcrumbs amount - with custom limit; all at once', () => {
      client.setBreadcrumbs(getBreadcrumbs(maxBreadcrumbs + 2));

      expect(client.state.breadcrumbs?.length).toBe(maxBreadcrumbs);
    });

    it('should limit breadcrumbs amount - with default limit; incremental addition', () => {
      const anotherClient = new BrowserMicroSentryClient({});

      getBreadcrumbs(MAX_BREADCRUMBS + 2).forEach((bc) =>
        anotherClient.addBreadcrumb(bc)
      );

      expect(anotherClient.state.breadcrumbs?.length).toBe(MAX_BREADCRUMBS);
    });

    it('should limit breadcrumbs amount - with default limit; all at once', () => {
      const anotherClient = new BrowserMicroSentryClient({});
      anotherClient.setBreadcrumbs(getBreadcrumbs(MAX_BREADCRUMBS + 2));

      expect(anotherClient.state.breadcrumbs?.length).toBe(MAX_BREADCRUMBS);
    });

    it('should save only last breadcrumbs; incremental addition', () => {
      getBreadcrumbs(maxBreadcrumbs + 2).forEach((bc) =>
        client.addBreadcrumb(bc)
      );

      expect(
        (client.state.breadcrumbs ?? [])
          .map((breadcrumb) => breadcrumb.event_id)
          .join(',')
      ).toEqual('id2,id3,id4,id5,id6,id7,id8,id9,id10,id11');
    });

    it('should save only last breadcrumbs; all at once', () => {
      client.setBreadcrumbs(getBreadcrumbs(maxBreadcrumbs + 2));

      expect(
        (client.state.breadcrumbs ?? [])
          .map((breadcrumb) => breadcrumb.event_id)
          .join(',')
      ).toEqual('id2,id3,id4,id5,id6,id7,id8,id9,id10,id11');
    });

    it('should not add breadcrumbs at all if maxBreadcrumbs is set to 0; incremental addition', () => {
      const anotherClient = new BrowserMicroSentryClient({ maxBreadcrumbs: 0 });

      getBreadcrumbs(1).forEach((bc) => anotherClient.addBreadcrumb(bc));

      expect(anotherClient.state.breadcrumbs?.length).toBe(0);
    });

    it('should not add breadcrumbs at all if maxBreadcrumbs is set to 0; all at once', () => {
      const anotherClient = new BrowserMicroSentryClient({ maxBreadcrumbs: 0 });

      anotherClient.setBreadcrumbs(getBreadcrumbs(1));

      expect(anotherClient.state.breadcrumbs?.length).toBe(0);
    });

    it('should ignore maxBreadcrumbs option if maxBreadcrumbs is a negative number; incremental addition', () => {
      const anotherClient = new BrowserMicroSentryClient({
        maxBreadcrumbs: -100,
      });

      getBreadcrumbs(MAX_BREADCRUMBS + 2).forEach((bc) =>
        anotherClient.addBreadcrumb(bc)
      );

      expect(anotherClient.state.breadcrumbs?.length).toBe(MAX_BREADCRUMBS);
    });

    it('should ignore maxBreadcrumbs option if maxBreadcrumbs is a negative number; all at once', () => {
      const anotherClient = new BrowserMicroSentryClient({
        maxBreadcrumbs: -100,
      });

      anotherClient.setBreadcrumbs(getBreadcrumbs(MAX_BREADCRUMBS + 2));

      expect(anotherClient.state.breadcrumbs?.length).toBe(MAX_BREADCRUMBS);
    });

    it('should skip breadcrumbs if beforeBreadcrumb returns null', () => {
      client = new BrowserMicroSentryClient({
        dsn: 'http://secret@exampl.dsn/2',
        release: '1.0.0',
        beforeBreadcrumb: (breadcrumb) =>
          breadcrumb.level === Severity.debug ? null : breadcrumb,
      });

      // NOTE: breadcrump to be ignored
      client.addBreadcrumb({
        event_id: 'id1',
        type: 'console',
        level: Severity.debug,
      });

      // NOTE: breadcrump to be added
      client.addBreadcrumb({
        event_id: 'id2',
        type: 'console',
        level: Severity.critical,
      });

      expect(client.state.breadcrumbs).toEqual([
        {
          event_id: 'id2',
          type: 'console',
          level: 'critical',
          timestamp: expect.any(Number),
        },
      ]);
    });

    afterEach(() => {
      client.clearState();
    });
  });

  describe('clone', () => {
    let clonedClient: BrowserMicroSentryClient;

    beforeAll(() => {
      client
        .setExtra('someExtra', 'extra value')
        .setTags({ tag: 'value' })
        .setUser({ email: 'qwerty@example.com' });

      clonedClient = client.clone();
    });

    it('Cloned client has the same settings', () => {
      expect(clonedClient.state).toStrictEqual(client.state);
      expect(clonedClient.apiUrl).toStrictEqual(client.apiUrl);
      expect(clonedClient.authHeader).toStrictEqual(client.authHeader);
    });

    it('Cloned client is actually a client', () => {
      expect(clonedClient === client).toBe(false);
    });

    it('Cloning creates a new state', () => {
      expect(clonedClient.state === client.state).toBe(false);
    });

    it('withScope is called with a copu of current client', () => {
      client.withScope((clone) => {
        expect(clonedClient.state).toStrictEqual(client.state);
        expect(clonedClient.apiUrl).toStrictEqual(client.apiUrl);
        expect(clonedClient.authHeader).toStrictEqual(client.authHeader);

        expect(clone === client).toBe(false);
      });
    });

    afterAll(() => {
      client.clearState();
    });
  });

  describe('beforeSend', () => {
    let sendSpy: jest.SpyInstance;
    let beforeSendClient: BrowserMicroSentryClient;

    beforeAll(() => {
      beforeSendClient = new BrowserMicroSentryClient({
        dsn: 'http://secret@exampl.dsn/2',
        release: '1.0.0',
        beforeSend: () => null,
      });

      sendSpy = jest.spyOn(
        // смотрим за супер Methodом, что бы отлавливать мутации в Methodе дочернего класса
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (beforeSendClient.constructor as any).__proto__.prototype,
        'send'
      );
    });

    it('Should not send data if beforeSend returns null', () => {
      beforeSendClient.report({ message: 'Error', name: 'Error', stack: '' });

      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('Should not clean breadcrumbs if beforeSend returns null', () => {
      beforeSendClient.addBreadcrumb({
        event_id: 'id',
        type: 'console',
        level: Severity.critical,
      });
      beforeSendClient.report({ message: 'Error', name: 'Error', stack: '' });

      expect(beforeSendClient.state.breadcrumbs?.length).toBe(1);
    });
  });

  describe('Data sending', () => {
    let sendSpy: jest.SpyInstance;

    beforeAll(() => {
      sendSpy = jest.spyOn(
        // смотрим за супер Methodом, что бы отлавливать мутации в Methodе дочернего класса
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client.constructor as any).__proto__.prototype,
        'send'
      );

      client.setTags({ tag: 'value' }).setExtras({ tag: 'value' });
    });

    it('Set data is in data to send', () => {
      Object.defineProperty(window, 'location', {
        value: new URL(
          'https://example.com?env=development&auth=123&code=3212'
        ),
        configurable: true,
      });

      client.report({ message: 'Error', name: 'Error', stack: '' });

      expect(sendSpy).toHaveBeenCalledWith({
        release: '1.0.0',
        exception: {
          values: [
            {
              stacktrace: {
                frames: [],
              },
              type: 'Error',
              value: 'Error',
            },
          ],
        },
        platform: 'javascript',
        request: {
          headers: {
            'User-Agent': expect.any(String),
          },
          url: expect.any(String),
          query_string: 'env=development&auth=123&code=3212',
        },
        sdk: { name: 'micro-sentry.javascript.browser', version: '0.0.0' },
        extra: {
          tag: 'value',
        },
        tags: { tag: 'value' },
        timestamp: expect.any(Number),
        event_id: expect.any(String),
      });
    });

    it('Message has correct fields and log level', () => {
      Object.defineProperty(window, 'location', {
        value: '/some/path?env=development&auth=123&code=3212',
        configurable: true,
      });
      client.captureMessage('Message', Severity.debug);

      expect(sendSpy).toHaveBeenCalledWith({
        release: '1.0.0',
        message: 'Message',
        level: 'debug',
        platform: 'javascript',
        request: {
          headers: {
            'User-Agent': expect.any(String),
          },
          url: expect.any(String),
          query_string: 'env=development&auth=123&code=3212',
        },
        sdk: { name: 'micro-sentry.javascript.browser', version: '0.0.0' },
        extra: {
          tag: 'value',
        },
        tags: { tag: 'value' },
        timestamp: expect.any(Number),
        event_id: expect.any(String),
      });
    });
  });
});
