import init from '../src/worker';
import MockSocket from '../__mocks__/socket';

jest.mock('child_process');
jest.mock('../src/socket_server');

const mockExecutable = './__mocks__/rScript.sh';
const Worker = init(mockExecutable);

describe('Worker', () => {
  test('should throw when initialised with bad path', () => {
    const initialise = () => new Worker('xxx');
    expect(initialise).toThrow();
  });

  test('should initialize', () => {
    const worker = new Worker(mockExecutable);
    expect(worker).toBeInstanceOf(Worker);
  });

  test('should fail silently when spawn returns null', () => {
    const worker = new Worker(mockExecutable);
    expect(worker).toBeInstanceOf(Worker);
    expect(worker.process).toBe(null);
  });
});

describe('emit', () => {
  const worker = new Worker(mockExecutable);
  const socket = new MockSocket();

  test('should return false if worker is not alive', () => {
    worker.alive = false;
    const result = worker.emit('name', 1, 2, 3);
    expect(result).toBe(false);
    worker.alive = true;
  });

  test('should push messages to message queue if no socket is present', () => {
    expect(worker.socketQueue.length).toBe(0);
    worker.emit('name', 1, 2, 3);
    expect(worker.socketQueue.length).toBe(1);
    expect(worker.socketQueue[worker.socketQueue.length - 1]).toEqual({
      event: 'name',
      data: [1, 2, 3]
    });
    worker.socketQueue = [];
  });

  test('should write to socket if one is present', () => {
    socket.write = jest.fn();
    worker.attachSocket(socket);
    worker.emit('name', 1, 2, 3);
    expect(socket.write).toHaveBeenCalledTimes(1);
    expect(socket.write).toHaveBeenCalledWith('{"event":"name","data":[1,2,3]}\n', 'utf8');
  });
});

describe('attachSocket', () => {
  const worker = new Worker(mockExecutable);
  const socket = new MockSocket();

  test('should only add a socket if one isnt present yet', () => {
    worker.socket = 'placeholder';
    worker.attachSocket(socket);
    expect(worker.socket).toBe('placeholder');
  });
});

describe('flushSocketQueue', () => {
  const worker = new Worker(mockExecutable);
  const socket = new MockSocket();

  test('should flush queued messages when a socket is added', () => {
    expect(worker.socketQueue.length).toBe(0);
    worker.emit('name', 1, 2, 3);
    expect(worker.socketQueue.length).toBe(1);
    socket.write = jest.fn();
    worker.attachSocket(socket);
    expect(socket.write).toHaveBeenCalledTimes(1);
    expect(socket.write).toHaveBeenCalledWith('{"event":"name","data":[1,2,3]}\n', 'utf8');
  });

  test('should fail silently', () => {
    const testFn = () => worker.flushSocketQueue();
    worker.socket = null;
    expect(testFn).not.toThrow();
  });
});

describe('detachSocket', () => {
  const worker = new Worker(mockExecutable);
  const socket = new MockSocket();

  test('removes socket if one exists', () => {
    worker.socket = socket;
    worker.detachSocket();
    expect(worker.socket).toBe(null);
  });

  test('should fail silently', () => {
    const testFn = () => worker.detachSocket();
    worker.socket = null;
    expect(testFn).not.toThrow();
  });
});

describe('kill', () => {
  const worker = new Worker(mockExecutable);

  test('should fail silently if worker is no longer alive', () => {
    worker.alive = false;
    return worker.kill()
      .then(() => 'worked')
      .catch(() => 'failed')
      .then(result => expect(result).toBe('failed'));
  });

  test('should trigger timeout if cleanup doesnt run in time', () => {
    worker.process = null;
    worker.alive = true;
    return worker.kill('sig', 100)
      .then(() => 'worked')
      .catch(() => 'failed')
      .then(result => expect(result).toBe('failed'));
  });
});

describe('cleanup', () => {
  const worker = new Worker(mockExecutable);

  test('should fail silently if worker is still alive', () => {
    const testFn = () => worker.cleanup();
    worker.alive = true;
    expect(testFn).not.toThrow();
  });

  test('should destroy and detach sockets', () => {
    const socket = new MockSocket();
    socket.destroy = jest.fn();
    worker.alive = false;
    worker.socket = socket;
    worker.cleanup();
    expect(socket.destroy).toHaveBeenCalledTimes(1);
    expect(worker.socket).toBe(null);
  });
});
