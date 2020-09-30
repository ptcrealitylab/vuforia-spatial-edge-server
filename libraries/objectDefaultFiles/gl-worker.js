let gl = {};
let id = 0;
let proxies = [];

const pending = {};

// Render function specified by worker script
let render;

// Unique worker id
let workerId;

// Local hidden gl context used to generate placeholder objects for gl calls
// that require valid objects
let realGl;

// const cacheGetParameter = {
//   3379: 8192,
//   7938: 'WebGL 1.0',
//   34076: 8192,
//   34921: 16,
//   34930: 16,
//   35660: 16,
//   35661: 80,
//   36347: 1024,
//   36348: 32,
//   36349: 1024,
// };

/**
 * Makes a stub for a given function which sends a message to the gl
 * implementation in the parent.
 * @param {string} functionName
 * @return {any} a placeholder object from the local hidden gl context (realGl).
 */
function makeStub(functionName) {
  return function() {
    const invokeId = id;
    id += 1;

    let args = Array.from(arguments);
    for (let i = 0; i < args.length; i++) {
      if (args[i].hasOwnProperty('__uncloneableId')) {
        args[i] = {
          fakeClone: true,
          index: args[i].__uncloneableId,
        };
      }
    }

    window.parent.postMessage({
      workerId,
      id: invokeId,
      name: functionName,
      args,
    }, '*');

    if (realGl) {
      const unclonedArgs = Array.from(arguments).map(a => {
        if (a.__uncloneableId && !a.__uncloneableObj) {
          console.error('invariant ruined');
        }

        if (a.__uncloneableObj) {
          return a.__uncloneableObj;
        }
        return a;
      });

      const res = realGl[functionName].apply(realGl, unclonedArgs);

      if (typeof res === 'object') {
        let proxy = new Proxy({
          __uncloneableId: invokeId,
          __uncloneableObj: res,
        }, {
          get: function(obj, prop) {
            if (prop === 'hasOwnProperty' || prop.startsWith('__')) {
              return obj[prop];
            } else {
              return obj.__uncloneableObj[prop];
            }
          },
        });

        proxies.push(proxy);
        return proxy;
      }
      return res;
    }

    // if (functionName === 'getParameter') {
    //   return cacheGetParameter[arguments[0]];
    // }

    return new Promise(res => {
      pending[invokeId] = res;
    });
  };
}

window.addEventListener('message', function(event) {
  const message = event.data;
  if (message.name === 'bootstrap') {
    for (const fnName of message.functions) {
      gl[fnName] = makeStub(fnName);
    }

    gl = new Proxy(gl, {
      get: function(obj, prop) {
        if (typeof obj[prop] === 'function') {
          // TODO dynamically stub
        }
        return obj[prop];
      },
    });


    for (const constName in message.constants) {
      gl[constName] = message.constants[constName];
    }

    main();
    return;
  }

  if (pending.hasOwnProperty(message.id)) {
    pending[message.id](message.result);
    delete pending[message.id];
  }

  if (message.name === 'frame') {
    render(message.time);

    window.parent.postMessage({
      workerId,
      isFrameEnd: true,
    }, '*');
  }
});
