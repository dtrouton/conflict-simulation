global.localStorage = {
  store: {},
  getItem: jest.fn((key) => global.localStorage.store[key] || null),
  setItem: jest.fn((key, value) => {
    global.localStorage.store[key] = value.toString();
  }),
  removeItem: jest.fn((key) => {
    delete global.localStorage.store[key];
  }),
  clear: jest.fn(() => {
    global.localStorage.store = {};
  })
};

global.fetch = jest.fn();

beforeEach(() => {
  global.localStorage.clear();
  fetch.mockClear();
});