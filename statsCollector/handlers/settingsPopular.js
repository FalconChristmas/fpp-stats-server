// Counts how often each setting has been changed from its default
"use strict";

const util = require("../lib/util.js");

// Effective defaults, vendored from fpp's www/settings.json by
// tools/gen-settings-policy.js.  FPP's first-boot wizard writes settings such as
// Locale, passwordEnable and WifiRegulatoryDomain on every install, so a key being
// present in the settings file does not mean anyone changed it.  A setting with no
// known default is counted whenever it is present, as before.
const policy = require("../lib/settings-policy.json").settings;

// Audio and media settings are chosen by hardware detection at boot, not by the
// user: fppinit writes AudioOutput and AudioMixerDevice for whatever card it
// finds.  They would top this chart on every install, so they are left out and
// covered by the audioDevice and mediaBackend handlers instead.
//
// The setup wizard will not continue until these are picked, so every new
// install reports one whether or not anyone would have changed it.  TimeZone
// has its own chart.
const WIZARD_REQUIRED = new Set(["TimeZone", "Locale", "LegalJurisdiction"]);

function isSystemManaged(setting) {
    return /^(Audio|PipeWire)/.test(setting) || setting === "MediaBackend" ||
        WIZARD_REQUIRED.has(setting);
}

function isDefault(setting, value) {
    const def = policy[setting];
    return !!def && "default" in def && String(value) === def.default;
}

let myData = {
};

module.exports = [
    {
        name: "settingsPopular",
        description: "Describes how frequently specific settings are changed from their default value in a settings file.",
        reset: async () => {
            myData = {
            };
        },
        results: async () => {
            if ("FPP_UUID" in myData) {
                delete myData.FPP_UUID;
            }
            return myData;
        },
        currentHandler: async (obj) => {
            if ("settings" in obj) {
                for (const [setting, value] of Object.entries(obj.settings)) {
                    if (isSystemManaged(setting) || isDefault(setting, value)) {
                        continue;
                    }
                    if (!(setting in myData)) {
                        myData[setting] = util.newCountByAgeObject();
                    }
                    // Only if the setting is changed will it be counted. Different than other statistics
                    util.countByAge(myData[setting], obj);
                }
            }

        },
    },
];
