sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/PDFViewer",
	"sap/base/security/URLListValidator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment"
], function (Controller, PDFViewer, URLListValidator, JSONModel, Fragment) {
	"use strict";

	return Controller.extend("ndbs.training.travel_form.controller.Homepage", {
		onInit: function () {
			this._pdfViewer = new PDFViewer();
			this.getView().addDependent(this._pdfViewer);
		},
		onComplete: async function () {
			let oModel = this.getView().getModel("globalJSONModel"),
				sFormName = "TRAVEL_FORM",
				sTemplateName = "TRAVEL_FORM_XDP",
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
				sXMLData = this._convertObjectToXML(oAdjustedData);

			try {
				oPDFForm = await this._getFormandToken(sFormName, sTemplateName);

				oPayload = {
					"xdpTemplate": oPDFForm.data.xdpTemplate,
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
						let sBase64EncodedPDF = oFormData.fileContent;

						if (sBase64EncodedPDF === undefined) {
							return;
						}

						let sDecodedPdfContent = atob(sBase64EncodedPDF);
						let aByteArray = new Uint8Array(sDecodedPdfContent.length)

						for (let i = 0; i < sDecodedPdfContent.length; i++) {
							aByteArray[i] = sDecodedPdfContent.charCodeAt(i);
						}

						let oBlob = new Blob([aByteArray.buffer], {
							type: 'application/pdf'
						});

						let sPDFUrl = URL.createObjectURL(oBlob);
						URLListValidator.add("blob");
						this._pdfViewer.setSource(sPDFUrl);
						this._pdfViewer.setTitle("Travel Form");
						this._pdfViewer.open();
					}.bind(this),
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
		onValueHelpRequested: function (oEvent) {
			let oView = this.getView();

			this._locationInput = oEvent.getSource();

			if (!this._pDialog) {
				this._pDialog = Fragment.load({
					id: oView.getId(),
					name: "ndbs.training.travel_form.fragments.ValueHelp",
					controller: this
				}).then(function (oDialog) {
					oDialog.setModel(oView.getModel());
					return oDialog;
				});
			}

			this._pDialog.then(function (oDialog) {
				oDialog.open();
			}.bind(this));
		},
		onValueHelpDialogClose: function (oEvent) {
			let sSelectedLocation = oEvent.getParameter("selectedItem").getTitle();
			this._locationInput.setValue(sSelectedLocation);
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
		_getFormandToken: function (sFormName, sTemplateName) {
			return new Promise((resolve, reject) => {
				$.ajax({
					url: `/ads.restapi/v1/forms/${sFormName}/templates/${sTemplateName}`,
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
		_convertObjectToXML: function (oObject) {
			let sXML = '';
			for (var property in oObject) {
				sXML += oObject[property] instanceof Array ? '' : "<" + property + ">";
				if (oObject[property] instanceof Array) {
					for (var array in oObject[property]) {
						sXML += "<" + property + ">";
						sXML += this._convertObjectToXML(new Object(oObject[property][array]));
						sXML += "</" + property + ">";
					}
				} else if (typeof oObject[property] == "object") {
					sXML += this._convertObjectToXML(new Object(oObject[property]));
				} else {
					sXML += oObject[property];
				}
				sXML += oObject[property] instanceof Array ? '' : "</" + property + ">";
			}
			sXML = sXML.replace(/<\/?[0-9]{1,}>/g, '');
			return sXML;
		}
	});
});