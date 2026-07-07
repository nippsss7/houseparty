const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# withDisableUserScriptSandboxing";

/**
 * Newer Xcode's "User Script Sandboxing" blocks CocoaPods' "[CP] Copy
 * XCFrameworks" script phase from registering an execution policy exception,
 * failing the build with "RegisterExecutionPolicyException" on targets like
 * ReactNativeDependencies/Turf. Disabling sandboxing for all Pods targets is
 * CocoaPods/React Native's own documented workaround until upstream fixes it.
 * Implemented as a plugin that patches the generated ios/Podfile (rather than
 * hand-editing it) so the fix survives `expo prebuild --clean` and EAS builds.
 */
module.exports = function withDisableUserScriptSandboxing(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfilePath, "utf8");

      if (!contents.includes(MARKER)) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n    ${MARKER}\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |config|\n        config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'\n      end\n    end`
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
