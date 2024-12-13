/*!
 * Cardmarket Utilities
 * ==================================
 * Description: Enhances Cardmarket.com.
 * Version: 1.0.0
 * Author: DavidSdot
 * GitHub: https://github.com/your-username/repository-name
 * Homepage: https://your-username.github.io/repository-name/
 * License: MIT
 *
 * Modules:
 * - ShoppingCart: Check other sellers from the shopping cart for card prices.
 *
 * Usage:
 * 1. Add the bookmarklet to your browser:
 *    javascript:(function(){s=document.createElement('script');s.src='https://davidsdot.github.io/CardmarketUtilities/CardmarketUtilities.js?%27+Math.random();document.body.appendChild(s);})()
 * 2. Visit the Cardmarket shopping cart page.
 * 3. Click the bookmarklet to load the helper.
 *
 * Changelog:
 * - v1.0.0: Initial release
 * - v1.0.1: Add shopping cart settings
 *
 * Last Updated: 2024-12-11
 */

"use strict";

// Base URL and language setup
const baseUrl = "https://www.cardmarket.com/";
const language = document.location.pathname.substr(1, 2);

// Utility module
const Utilities = {

	delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	},

	createHiddenIframe(src) {
		const frameId = `iframe_${Math.random() * 1e8}`;
		const iframe = $(`<iframe id="${frameId}" style="display:none;"></iframe>`).appendTo("body")[0];
		iframe.src = src;
		return iframe;
	},

	// Display message
	displayMessage(text, warning) {
		const alertId = `systemMessage${Math.random() * 1e8}`;
		const alertHtml = `
			<div role="alert" id="${alertId}" class="alert systemMessage ${(warning ? "alert-warning" : "alert-success")} alert-dismissible fade show">
				<span class="fonticon-check-circle alert-icon"></span>
				<button type="button" data-bs-dismiss="alert" aria-label="Close" class="btn-close"></button>
				<div class="alert-content">
					<h4 class="alert-heading">${text}</h4>
				</div>
			</div>`;

		$('#AlertContainer').append(alertHtml);

		setTimeout(() => {
			$(`#${alertId}`).alert('close');
			$('#AlertContainer').empty();
		}, 5000);
	},

	// sanitize user inputs
	sanitizeHTML(str) {
		const tempDiv = document.createElement("div");
		tempDiv.innerText = str;
		return tempDiv.innerHTML;
	},

	// creat a unique id
	createId(str) {
		return crypto.randomUUID()
			+ '-' + str
			.replace(/[^a-z0-9 -]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-');
	}
};

// ShoppingCart module
const ShoppingCart = {

	sellers: [],

	sellersStorage: "CardmarketUtilitiesShoppingCartHelperSellers",

	// Initialization
	init() {
		this.addSettings();
		this.updateSellers();
		this.preparePage();
		Utilities.displayMessage("Cardmarket Utilities: ShoppingCart is ready");
	},

	// Update sellers with page sellers and stored sellers
	updateSellers() {
		let storedSellers = this.getStoredSellers();
		$('#CMUSCstoredSellers').empty();
		for (const seller of storedSellers) {
			let sellerId = Utilities.createId(seller);
			$('#CMUSCstoredSellers').append(this.createSellerListItem(seller, sellerId));
			$(`#CMUSCstoredSellersDelete_${sellerId}`).click(() => {
				$(`#CMUSCstoredSellers_${sellerId}`).remove();
				let storedSellers = this.getStoredSellers();
				storedSellers = storedSellers.filter(e => e !== seller)
				localStorage.setItem(this.sellersStorage, JSON.stringify(storedSellers));
			});

		}
		this.sellers = [...new Set(this.getPageSellers().concat(storedSellers))];
	},
	createSellerListItem(seller, id) {
		return `
			<li id="CMUSCstoredSellers_${id}" style="margin-bottom:2px;">
				<div class="input-group">
					<button id="CMUSCstoredSellersDelete_${id}" class="btn btn-sm btn-outline-danger bg-white border-light text-danger">
						<span class="fonticon-delete"></span>
					</button>
					<input class="form-control" value="${seller}" readonly="">
				</div>
			</li>
		`;
	},

	// Retrieves the list of sellers from the page and the local storage
	getPageSellers() {
		const pageSellers = Array
			.from($('span.seller-name span > a[href*="/Magic/Users/"]'))
			.map(seller => seller.innerText)
		return [...new Set(pageSellers)]
	},

	// Retrieves the list of sellers from local storage
	getStoredSellers() {
		const storedSellers = JSON.parse(localStorage.getItem(this.sellersStorage)) || [];
		return [...new Set(storedSellers)]
	},

	// Prepares the entire shopping cart page
	async preparePage() {
		const sections = $("section.shipment-block");
		for (const section of sections) {
			await this.prepareSection(section);
		}
	},

	// Prepares a single section
	async prepareSection(section) {
		const sectionSeller = $(section).find('a[href*="/Magic/Users/"]').first().text();
		const rows = $(section).find("tr[data-name]");
		for (const row of rows) {
			await this.prepareRow(row, sectionSeller);
		}
	},

	// Prepares a single card row
	async prepareRow(cardRow, sectionSeller) {
		const cardName = $(cardRow).attr("data-name").trim();
		const iconsDiv = $(cardRow).find("td.info div.row");
		iconsDiv.prepend(`
			<div class="col-icon">
				<button type="button" class="btn btn-sm bg-white border-light">
					<span class="fonticon-search"></span>
				</button>
			</div>
		`);

		const searchButton = iconsDiv.find("div.col-icon button");
		searchButton.click(async () => {
			await this.handleSearchButtonClick(searchButton, cardName, sectionSeller, cardRow);
		});
	},

	// Handles search button clicks
	async handleSearchButtonClick(searchButton, cardName, sectionSeller, cardRow) {
		searchButton.prop("disabled", true);
		$('tr[data-card="Swiftfoot Boots"]').remove();
		for (const seller of this.sellers) {
			if (seller !== sectionSeller) {
				await this.fetchSellerDataAndDisplay(seller, cardName, cardRow);
				await Utilities.delay(500);
			}
		}
		searchButton.prop("disabled", false);
	},

	// Fetches seller prices and displays them
	async fetchSellerDataAndDisplay(seller, card, cardRowElement) {
		const iframe = Utilities.createHiddenIframe(this.getCardSearchPageUrl(seller, card));
		return new Promise(resolve => {
			iframe.onload = () => {
				const priceElement = iframe.contentWindow.document.querySelector("#UserOffersTable div.price-container span");
				if (priceElement) {
					const attributes = iframe.contentWindow.document.querySelector("#UserOffersTable div.product-attributes");
					const priceHtml = `
						<tr data-card="${card}">
							<td></td>
							<td> • </td>
							<td style="text-align: left;">
								<span><a target="_blank" href="${iframe.src}">${seller}</a></span>
							</td>
							<td style="text-align:left;">
									<div style="display: inline-flex;align-items: center;">${attributes.innerHTML}</div>
							</td>
							<td><i>${priceElement.innerText}</i></td>
							<td></td>
						</tr>`;
					$(cardRowElement).after(priceHtml);
				}
				$(iframe).remove();
				resolve();
			};
		});
	},

	// Generates the URL for the card search page of a seller
	getCardSearchPageUrl(seller, card) {
		return `${baseUrl}${language}/Magic/Users/${seller}/Offers/Singles?name=${card}&sortBy=price_asc`;
	},

	addSettings() {
		const settingsHTML = `
			<div id="CMUSCSettings" class="card w-100 text-start mb-3">
				<div class="card-body d-flex flex-column">
					<div>
						<h3 class="text-size-regular">Shopping Cart Helper</h3>
						<div class="text-break">
							<div>
								<h2 class="small" style="margin-right: 5px;">Add Sellers</h2>
								<div style="display: flex; align-content: center;">
									<input id="CMUSCaddSellerInput" class="form-control form-control-sm" style="height:15px; margin-right:10px" type="text"/>
									<button id="CMUSCaddSellerButton" type="submit" class="btn btn-sm bg-white border-light">
										<span class="fonticon-plus"></span>
									</button>
								</div>
								<ul id="CMUSCstoredSellers" style="margin-top:5px;margin-bottom:0;list-style:none;padding:0;">
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
		$('div.order-first').prepend(settingsHTML);
		$("#CMUSCaddSellerButton").click(() => {
			const input = $('#CMUSCaddSellerInput');
			const sellerName = Utilities.sanitizeHTML(input.val().trim());
			if (sellerName) {
				let lSellers = this.getStoredSellers();
				if (!lSellers.includes(sellerName)) {
					lSellers.push(sellerName);
					localStorage.setItem(this.sellersStorage, JSON.stringify(lSellers));
					input.val('');
				}
			}
			this.updateSellers();
		});
	}
};

// Page navigation module
const PageNavigator = {
	init() {
		const currentPath = document.location.pathname;
		switch (true) {
			case currentPath.endsWith(`${language}/Magic/ShoppingCart`):
				ShoppingCart.init();
				break;
			default:
				Utilities.displayMessage("Cardmarket Utilities: No functionality defined for this page.", true);
		}
	}
};

// Initialize the PageNavigator
PageNavigator.init();
