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
 *
 * Last Updated: 2024-12-10
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
	}
};

// ShoppingCart module
const ShoppingCart = {
    sellers: [],

    // Initialization
    init() {
        this.sellers = this.getSellers();
        this.preparePage();
		Utilities.displayMessage("Cardmarket Utilities: ShoppingCart is ready");
    },

    // Retrieves the list of sellers from the page
    getSellers() {
        return Array.from($('span.seller-name span > a[href*="/Magic/Users/"]'))
            .map(seller => seller.innerText);
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
