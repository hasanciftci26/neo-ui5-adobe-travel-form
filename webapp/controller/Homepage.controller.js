sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller, xmlconverter) {
	"use strict";

	return Controller.extend("ndbs.training.travel_form.controller.Homepage", {
		onInit: function () {

		},
		onComplete: async function () {
			let oModel = this.getView().getModel("globalJSONModel"),
				sFormName = "TRAVEL_FORM",
				oPDFForm,
				oPayload,
				oData = oModel.getData(),
				oAdjustedData = {
					Travel: {
						ContentMain: {
							FirstName: oData.FirstName,
							LastName: oData.LastName,
							PersonnelNo: oData.PersonnelNo,
							RouteCount: oData.Travels.length,
							RoutesTable: {
								HeaderRow: null,
								Row: oData.Travels.map(travel => {
									return {
										Departure: travel.Departure,
										Arrival: travel.Arrival,
										Purpose: this._getPurposeText(travel.Purpose),
										From: travel.From + "T000000",
										To: travel.To + "T000000"
									}
								})
							}
						}
					}
				},
				sXMLData = this.OBJtoXML(oAdjustedData);

			try {
				oPDFForm = await this._getFormandToken(sFormName);

				oPayload = {
					"xdpTemplate": oPDFForm.data.templates[0].xdpTemplate,
					"xmlData": btoa(sXMLData),
					"formType": "Print",
					"formLocale": "de_DE",
					"taggedPdf": 1,
					"embedFont": 0
				};
				sap.ui.core.BusyIndicator.show(100);
				$.ajax({
					url: "/ads.restapi/v1/adsRender/pdf",
					method: "POST",
					type: "POST",
					contentType: "application/json",
					data: JSON.stringify(oPayload),
					success: function (data, textStatus, jqXHR) {
						sap.ui.core.BusyIndicator.hide();
						let oFormData = data;
						var sBase64EncodedPDF = oFormData.fileContent;
						
						if (sBase64EncodedPDF === undefined) {
							return;
						}
						
						var sDecodedPdfContent = atob(sBase64EncodedPDF);
						var aByteArray = new Uint8Array(sDecodedPdfContent.length)
						
						for (var i = 0; i < sDecodedPdfContent.length; i++) {
							aByteArray[i] = sDecodedPdfContent.charCodeAt(i);
						}
						
						var oBlob = new Blob([aByteArray.buffer], {
							type: 'application/pdf'
						});
						
						let sPDFUrl = URL.createObjectURL(oBlob);
						window.open(sPDFUrl, '_blank');
					},
					error: function (data, textStatus, jqXHR) {
						sap.m.MessageBox.show("No data posted");
					}
				});
			} catch (error) {
				sap.m.MessageBox.error(error);
			}

		},
		onAddNewLine: function () {
			let oModel = this.getView().getModel("globalJSONModel"),
				oData = oModel.getData();

			if (oData.hasOwnProperty("Travels")) {
				oData.Travels.push({
					Departure: "",
					Arrival: "",
					Purpose: "BUS",
					From: null,
					To: null
				});
			} else {
				oData.Travels = [{
					Departure: "",
					Arrival: "",
					Purpose: "BUS",
					From: null,
					To: null
				}];
			}
			oModel.setData(oData);
		},
		_getPurposeText: function (sKey) {
			let sText = "";

			switch (sKey) {
			case "BUS":
				sText = "Business";
				break;
			case "OSM":
				sText = "On-site Meeting";
				break;
			case "VAC":
				sText = "Vacation";
				break;
			}

			return sText;
		},
		_getFormandToken: function (sFormName) {
			return new Promise((resolve, reject) => {
				$.ajax({
					url: `/ads.restapi/v1/forms/${sFormName}`,
					method: "GET",
					type: "GET",
					dataType: "json",
					beforeSend: function (xhr) {
						xhr.setRequestHeader("X-CSRF-Token", "Fetch")
					},
					async: false,
					success: function (data, textStatus, jqXHR) {
						resolve({
							token: jqXHR.getResponseHeader("X-CSRF-Token"),
							data: data
						});
					},
					error: function (data, textStatus, jqXHR) {
						reject("Error while fetching form data.");
					}
				});
			});
		},
		OBJtoXML: function (obj) {
			var xml = '';
			for (var prop in obj) {
				xml += obj[prop] instanceof Array ? '' : "<" + prop + ">";
				if (obj[prop] instanceof Array) {
					for (var array in obj[prop]) {
						xml += "<" + prop + ">";
						xml += this.OBJtoXML(new Object(obj[prop][array]));
						xml += "</" + prop + ">";
					}
				} else if (typeof obj[prop] == "object") {
					xml += this.OBJtoXML(new Object(obj[prop]));
				} else {
					xml += obj[prop];
				}
				xml += obj[prop] instanceof Array ? '' : "</" + prop + ">";
			}
			var xml = xml.replace(/<\/?[0-9]{1,}>/g, '');
			return xml
		}
	});
});