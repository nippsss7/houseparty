const { withEntitlementsPlist } = require("@expo/config-plugins");

/**
 * expo-notifications adds the aps-environment entitlement, but free personal
 * Apple teams can't sign it ("Personal development teams … do not support the
 * Push Notifications capability"), which breaks device builds. Strip it until
 * a paid Apple Developer team is configured — everything except receiving
 * remote pushes works without it, and usePushNotifications already handles
 * token-registration failure gracefully. DELETE this plugin (and its entry in
 * app.config.ts) once ios.appleTeamId points at a paid team.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    return config;
  });
};
