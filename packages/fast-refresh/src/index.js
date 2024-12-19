const signals = ["ref", "shallowRef", "reactive", "shallowReactive", "readonly"];

function isComponentishName(name) {
  return typeof name === "string" && name[0] >= "A" && name[0] <= "Z";
}

export default function (babel, opts = {}) {
  if (typeof babel.env === "function") {
    // Only available in Babel 7.
    const env = babel.env();
    if (env !== "development" && !opts.skipEnvCheck) {
      throw new Error(
        "React Refresh Babel transform should only be enabled in development environment. " +
          'Instead, the environment is: "' +
          env +
          '". If you want to override this check, pass {skipEnvCheck: true} as plugin options.'
      );
    }
  }
  const { types: t } = babel;

  let getInstanceId;
  let pluginId;
  let program;

  const alreadyOptimized = new Set();
  const toOptimize = new Set();
  const BRIDGE_NAME = "$bridge";
  let currentBridgeName = BRIDGE_NAME;

  const handleBridgeComponent = {
    BlockStatement(path) {
      if (!this.storageConst) {
        this.storageId = path.scope.generateUidIdentifier("storage");

        // getCurrentInstance().getPlugin(FastRefreshStoragePlugin);
        const call = t.callExpression(
          t.memberExpression(t.callExpression(getInstanceId, []), t.identifier("getPlugin")),
          [pluginId]
        );

        // const storage = getCurrentInstance().getPlugin(FastRefreshStoragePlugin);
        // _storage.start()
        this.storageConst = path.unshiftContainer("body", [
          t.variableDeclaration("const", [t.variableDeclarator(this.storageId, call)]),
          t.expressionStatement(t.callExpression(t.memberExpression(this.storageId, t.identifier("start")), []))
        ])[0];
      }
    },
    CallExpression(path) {
      if (path.node.callee.type === "Identifier" && signals.includes(path.node.callee.name)) {
        this.varDeclaration = path.findParent((path) => path.isVariableDeclaration());
        this.varDeclarator = path.findParent((path) => path.isVariableDeclarator());

        // storage.recover($signalName, $signalVar)
        this.varDeclaration.insertAfter(
          t.callExpression(t.memberExpression(this.storageId, t.identifier("recover")), [
            t.stringLiteral(this.varDeclarator.node.id.name),
            this.varDeclarator.node.id
          ])
        );
      }
    }
  };
  const isBridgeComponent = {
    CallExpression(path) {
      if (
        path.node.callee.name === currentBridgeName &&
        t.isIdentifier(path.node.arguments[0]) &&
        path.node.arguments[0].name === this.idName
      ) {
        this.isBridge();
      }
    }
  };

  function optimizeComponent(component) {
    component.traverse(handleBridgeComponent, { types: t });
  }

  return {
    name: "bridge-vue-fast-refresh",
    visitor: {
      Program: {
        enter(path) {
          program = path;
          pluginId = path.scope.generateUidIdentifier("FastRefreshStoragePlugin");

          getInstanceId = path.scope.generateUidIdentifier("getCurrentInstance");

          // Add : import { FastRefreshStoragePlugin, getCurrentInstance } from "@bridge/vue"
          path.unshiftContainer("body", [
            t.importDeclaration(
              [
                t.importSpecifier(pluginId, t.identifier("FastRefreshStoragePlugin")),
                t.importSpecifier(getInstanceId, t.identifier("getCurrentInstance"))
              ],
              t.stringLiteral("@bridge/vue")
            )
          ]);
        }
      },
      FunctionDeclaration(path) {
        // Looking for :
        // function Component() {}; $bridge(Component);
        if (isComponentishName(path.node.id.name)) {
          let isBridge = false;
          program.traverse(isBridgeComponent, {
            isBridge: () => void (isBridge = true),
            idName: path.node.id.name
          });
          if (isBridge) {
            optimizeComponent(path);
          }
        }
      },
      VariableDeclaration(path) {
        for (let i = 0; i < path.node.declarations.length; i++) {
          const declaration = path.get(`declarations.${i}`);
          const id = declaration.node.id;

          // Looking for :
          // const Component = $bridge(() => {});
          // const Component = $bridge(function () {});
          // const Component = $bridge(function Component() {});
          if (t.isCallExpression(declaration.node.init) && declaration.node.init.callee.name === currentBridgeName) {
            const root = declaration.get("init");
            if (root.node.arguments.length === 1) {
              root.node.arguments.push(t.stringLiteral(id.name));
            }
            const argument = root.get("arguments.0");
            if (argument.isArrowFunctionExpression() || argument.isFunctionExpression()) {
              optimizeComponent(argument);
              alreadyOptimized.add(id.name);
              toOptimize.delete(id.name);
            }

            if (argument.isIdentifier()) {
              if (!alreadyOptimized.has(id.name)) {
                toOptimize.add(id.name);
              }
            }
          }
        }
      },
      AssignmentExpression(path) {
        const assignement = path;
        const id = assignement.node.left;

        // Looking for :
        // Component = $bridge(() => {});
        if (t.isCallExpression(assignement.node.right) && assignement.node.right.callee.name === currentBridgeName) {
          const root = assignement.get("right");

          const argument = root.get("arguments.0");
          if (argument.isArrowFunctionExpression() || argument.isFunctionExpression()) {
            optimizeComponent(argument);
            alreadyOptimized.add(id.name);
            toOptimize.delete(id.name);
          }

          // It's "$bridge(Identifier)"
          // Checking if already processed or need to be processed
          if (argument.isIdentifier()) {
            if (!alreadyOptimized.has(id.name)) {
              toOptimize.add(id.name);
            }
          }
        }
      },
      ObjectProperty(path) {
        const assignement = path;
        const id = assignement.node.key;
        // Looking for :
        // { component: $bridge(() => {}) };
        if (t.isCallExpression(assignement.node.value) && assignement.node.value.callee.name === currentBridgeName) {
          const root = assignement.get("value");

          const argument = root.get("arguments.0");
          if (argument.isArrowFunctionExpression() || argument.isFunctionExpression()) {
            optimizeComponent(argument);
            alreadyOptimized.add(id.name);
            toOptimize.delete(id.name);
          }

          // It's "$bridge(Identifier)"
          // Checking if already processed or need to be processed
          if (argument.isIdentifier()) {
            if (!alreadyOptimized.has(id.name)) {
              toOptimize.add(id.name);
            }
          }
        }
      }
    }
  };
}