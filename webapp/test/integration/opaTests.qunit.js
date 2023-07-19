/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"ndbs/training/travel_form/test/integration/AllJourneys"
	], function () {
		QUnit.start();
	});
});