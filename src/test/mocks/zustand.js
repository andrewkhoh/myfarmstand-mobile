module.exports = {
  create: (fn) => {
    const state = fn();
    return () => state;
  }
};
