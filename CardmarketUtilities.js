/**
 * Cardmarket Utilities
 * ==================================
 * Description: Enhances Cardmarket.com functionality
 * Author: DavidSdot
 * License: MIT
 */
"use strict";

/**
 * Configuration and constants
 * @typedef {Object} Config
 */
const CONFIG = {
	BASE_URL: "https://www.cardmarket.com/",
	LANGUAGE: document.location.pathname.slice(1, 3),
	STORAGE_KEY: {
		SELLERS: "CardmarketUtilitiesShoppingCartHelperSellers"
	},
	SELECTORS: {
		ALERT_CONTAINER: '#AlertContainer',
		SELLER_NAME: 'span.seller-name span > a[href*="/Magic/Users/"]',
		SHIPMENT_BLOCK: 'section.shipment-block',
		CARD_ROWS: 'tr[data-name]'
	},
	TIMEOUTS: {
		MESSAGE_DISPLAY: 5000,
		REQUEST_DELAY: 750
	}
};

/**
 * Utility methods for common operations
 */
class Utilities {

	/**
	 * Creates a delay using Promise
	 * @param {number} ms - Milliseconds to delay
	 * @returns {Promise<void>}
	 */
	static delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Creates a hidden iframe
	 * @param {string} src - Source URL for the iframe
	 * @returns {HTMLIFrameElement} Created iframe element
	 */
	static createHiddenIframe(src) {
		const iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		iframe.src = src;
		document.body.appendChild(iframe);
		return iframe;
	}

	/**
	 * Displays a system message to the user
	 * @param {string} text - Message text
	 * @param {boolean} [isWarning=false] - Whether the message is a warning
	 */
	static displayMessage(text, isWarning = false) {
		const alertContainer = document.querySelector(CONFIG.SELECTORS.ALERT_CONTAINER);
		if (!alertContainer) return;

		const alertId = this.createId();
		const alertClass = isWarning ? 'alert-warning' : 'alert-success';

		const alertHtml = `
            <div role="alert" id="${alertId}" class="alert systemMessage ${alertClass} alert-dismissible fade show">
                <span class="fonticon-check-circle alert-icon"></span>
                <button type="button" data-bs-dismiss="alert" aria-label="Close" class="btn-close"></button>
                <div class="alert-content">
                    <h4 class="alert-heading">${this.sanitizeHTML(text)}</h4>
                </div>
            </div>
        `;

		alertContainer.insertAdjacentHTML('beforeend', alertHtml);

		const alertElement = document.getElementById(alertId);
		if (alertElement) {
			setTimeout(() => {
				alertElement.remove();
			}, CONFIG.TIMEOUTS.MESSAGE_DISPLAY);
		}
	}

	/**
	 * Sanitizes HTML to prevent XSS attacks
	 * @param {string} str - String to sanitize
	 * @returns {string} Sanitized string
	 */
	static sanitizeHTML(str) {
		const tempDiv = document.createElement('div');
		tempDiv.textContent = str;
		return tempDiv.innerHTML;
	}

	/**
	 * Creates a unique ID
	 * @returns {string} Generated unique ID
	 */
	static createId() {
		return `${crypto.randomUUID()}`;
	}

}

/**
 * Shopping Cart Utilities Module
 */
class ShoppingCart {
	/** @type {string[]} List of sellers */
	static sellers = [];

	/**
	 * Initializes the Shopping Cart module
	 */
	static init() {
		this.addSettings();
		this.updateSellers();
		this.preparePage();
		Utilities.displayMessage("Cardmarket Utilities: ShoppingCart is ready");
	}

	/**
	 * Updates the list of sellers from page and storage
	 */
	static updateSellers() {
		const storedSellers = this.getStoredSellers();
		const storedSellersList = document.getElementById('CMUSCstoredSellers');

		if (storedSellersList) {
			storedSellersList.innerHTML = '';
			storedSellers.forEach(seller => {
				const sellerId = Utilities.createId();
				storedSellersList.insertAdjacentHTML('beforeend', this.createSellerListItem(seller, sellerId));

				const deleteButton = document.getElementById(`CMUSCstoredSellersDelete_${sellerId}`);
				if (deleteButton) {
					deleteButton.addEventListener('click', () => {
						console.log('Deleting seller:', seller);
						const listItemToRemove = document.getElementById(`CMUSCstoredSellers_${sellerId}`);
						if (listItemToRemove) {
							listItemToRemove.remove();

							const updatedSellers = this.getStoredSellers().filter(s => s !== seller);
							localStorage.setItem(CONFIG.STORAGE_KEY.SELLERS, JSON.stringify(updatedSellers));

							this.sellers = [...new Set([...this.getPageSellers(), ...updatedSellers])];
						}
					});
				}
			});
		}

		this.sellers = [...new Set([...this.getPageSellers(), ...storedSellers])];
	}

	/**
	 * Creates a seller list item HTML
	 * @param {string} seller - Seller name
	 * @param {string} id - Unique identifier
	 * @returns {string} HTML for seller list item
	 */
	static createSellerListItem(seller, id) {
		return `
            <li id="CMUSCstoredSellers_${id}" style="margin-bottom:2px;">
                <div class="input-group">
                    <button id="CMUSCstoredSellersDelete_${id}" type="submit" class="btn btn-sm btn-outline-danger bg-white border-light text-danger">
                        <span class="fonticon-delete" />
                    </button>
                    <input class="form-control" value="${seller}" readonly="">
                </div>
            </li>
        `;
	}

	/**
	 * Retrieves sellers from the current page
	 * @returns {string[]} Unique list of sellers
	 */
	static getPageSellers() {
		const sellerElements = document.querySelectorAll(CONFIG.SELECTORS.SELLER_NAME);
		const pageSellers = Array.from(sellerElements).map(el => el.textContent.trim());
		return [...new Set(pageSellers)];
	}

	/**
	 * Retrieves sellers from local storage
	 * @returns {string[]} Unique list of stored sellers
	 */
	static getStoredSellers() {
		try {
			const storedSellers = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY.SELLERS)) || [];
			return [...new Set(storedSellers)];
		} catch (error) {
			console.error('Error retrieving stored sellers:', error);
			return [];
		}
	}

	/**
	 * Prepares the entire shopping cart page
	 */
	static async preparePage() {
		const sections = document.querySelectorAll(CONFIG.SELECTORS.SHIPMENT_BLOCK);
		for (const section of sections) {
			await this.prepareSection(section);
		}
	}

	/**
	 * Prepares a single section
	 * @param {HTMLElement} section - Section to prepare
	 */
	static async prepareSection(section) {
		const sectionSeller = section.querySelector('a[href*="/Magic/Users/"]')?.textContent.trim() || '';
		const rows = section.querySelectorAll(CONFIG.SELECTORS.CARD_ROWS);

		for (const row of rows) {
			await this.prepareRow(row, sectionSeller);
		}
	}

	/**
	 * Prepares a single card row
	 * @param {HTMLElement} cardRow - Row to prepare
	 * @param {string} sectionSeller - Seller of the current section
	 */
	static async prepareRow(cardRow, sectionSeller) {
		const cardName = cardRow.getAttribute('data-name').trim();
		const iconsDiv = cardRow.querySelector('td.info div.row');

		if (!iconsDiv) return;

		// Create search button
		const searchButtonWrapper = document.createElement('div');
		searchButtonWrapper.className = 'col-icon';
		searchButtonWrapper.innerHTML = `
            <button type="button" class="btn btn-sm bg-white border-light">
                <span class="fonticon-search"></span>
            </button>
        `;

		// Prepend the new button
		iconsDiv.prepend(searchButtonWrapper);

		const searchButton = searchButtonWrapper.querySelector('button');
		if (searchButton) {
			searchButton.addEventListener('click', async () => {
				await this.handleSearchButtonClick(searchButton, cardName, sectionSeller, cardRow);
			});
		}
	}

	/**
	 * Handles search button click event
	 * @param {HTMLButtonElement} searchButton - Search button element
	 * @param {string} cardName - Name of the card
	 * @param {string} sectionSeller - Current section seller
	 * @param {HTMLElement} cardRow - Current card row
	 */
	static async handleSearchButtonClick(searchButton, cardName, sectionSeller, cardRow) {
		searchButton.disabled = true;
		const existingAlternativeRows = document.querySelectorAll(`tr[data-card="${sectionSeller}-${cardName}"]`);

		existingAlternativeRows.forEach(row => row.remove());

		for (const seller of this.sellers) {
			if (seller !== sectionSeller) {
				await this.fetchSellerDataAndDisplay(sectionSeller, seller, cardName, cardRow);
				this.sortAlternativeRows(cardRow, sectionSeller, cardName);
				await Utilities.delay(CONFIG.TIMEOUTS.REQUEST_DELAY);
			}
		}

		if (document.querySelectorAll(`tr[data-card="${sectionSeller}-${cardName}"]`).length === 0) {
			Utilities.displayMessage(`No alternatives found for: ${cardName}`, true);
		} 
		searchButton.disabled = false;
	}

	/**
	* Sorts the alternative rows by a specific td
	* @param {HTMLElement} cardRow - Original card row
	* @param {string} sectionSeller - Current section seller
	* @param {string} cardName - Name of the card
	*/
	static sortAlternativeRows(cardRow, sectionSeller, cardName) {
		const alternativeRows = Array.from(document.querySelectorAll(`tr[data-card="${sectionSeller}-${cardName}"]`));
		const sortedRows = alternativeRows.sort((a, b) => {
			const priceA = parseFloat(a.querySelector('td:nth-child(5) i').innerText.replace(/[^\d.-]/g, ''));
			const priceB = parseFloat(b.querySelector('td:nth-child(5) i').innerText.replace(/[^\d.-]/g, ''));
			console.log(priceA, priceB);
			return priceB - priceA;
		});

		sortedRows.forEach(row => cardRow.insertAdjacentElement('afterend', row));
	}

	/**
	 * Fetches and displays seller data for a specific card
	 * @param {string} sectionSeller - Current section seller
	 * @param {string} seller - Seller to fetch data for
	 * @param {string} card - Card name
	 * @param {HTMLElement} cardRowElement - Original card row
	 * @returns {Promise<void>}
	 */
	static async fetchSellerDataAndDisplay(sectionSeller, seller, card, cardRowElement) {
		const iframe = Utilities.createHiddenIframe(this.getCardSearchPageUrl(seller, card));

		return new Promise(resolve => {
			iframe.onload = () => {
				try {
					if (iframe.contentWindow.location.href !== iframe.src) {
						throw new Error('302');
					}

					const priceElement = iframe.contentWindow.document.querySelector("#UserOffersTable div.price-container span");
					const attributes = iframe.contentWindow.document.querySelector("#UserOffersTable div.product-attributes");

					if (priceElement && attributes) {
						const priceHtml = document.createElement('tr');
						priceHtml.setAttribute('data-card', `${sectionSeller}-${card}`);
						priceHtml.innerHTML = `
                            <td></td>
                            <td> • </td>
                            <td style="text-align: left;">
                                <span><a target="_blank" href="${iframe.src}">${Utilities.sanitizeHTML(seller)}</a></span>
                            </td>
                            <td style="text-align:left;">
                                <div style="display: inline-flex;align-items: center;">${attributes.innerHTML}</div>
                            </td>
                            <td><i>${priceElement.innerText}</i></td>
                            <td></td>
                        `;
						cardRowElement.insertAdjacentElement('afterend', priceHtml);
					}
				} catch (error) {
					console.error('Error processing seller data:', error);
					if (error.message === '302') {
						Utilities.displayMessage(`Could not find seller : ${seller}`, true);
					}
				} finally {
					iframe.remove();
					resolve();
				}
			};
			// Handle potential iframe loading errors
			iframe.onerror = () => {
				console.error(`Failed to load iframe for seller ${seller}`);
				Utilities.displayMessage(`Failed to load data for seller ${seller}`, true);
				iframe.remove();
				resolve();
			};
		});
	}

	/**
	 * Generates the URL for a seller's card search page
	 * @param {string} seller - Seller name
	 * @param {string} card - Card name
	 * @returns {string} Search page URL
	 */
	static getCardSearchPageUrl(seller, card) {
		return `${CONFIG.BASE_URL}${CONFIG.LANGUAGE}/Magic/Users/${encodeURIComponent(seller)}/Offers/Singles?name=${encodeURIComponent(card)}&sortBy=price_asc`;
	}

	/**
	 * Adds settings UI to the page
	 * @private
	 */
	static addSettings() {
		const settingsHTML = `
            <div id="CMUSCSettings" class="card w-100 text-start mb-3">
                <div class="card-body d-flex flex-column">
                    <div>
                        <h3 class="text-size-regular">Shopping Cart Helper</h3>
                        <div class="text-break">
                            <div>
                                <h2 class="small" style="margin-right: 5px;">Add Sellers</h2>
                                <div style="display: flex; align-content: center;">
                                    <input id="CMUSCaddSellerInput" 
                                           class="form-control form-control-sm" 
                                           style="height:15px; margin-right:10px" 
                                           type="text" 
                                           placeholder="Enter seller name"/>
                                    <button id="CMUSCaddSellerButton" 
                                            type="submit" 
                                            class="btn btn-sm bg-white border-light">
                                        <span class="fonticon-plus"></span>
                                    </button>
                                </div>
                                <ul id="CMUSCstoredSellers" 
                                    style="margin-top:5px;margin-bottom:0;list-style:none;padding:0;">
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

		const orderFirstDiv = document.querySelector('div.order-first');
		if (orderFirstDiv) {
			orderFirstDiv.insertAdjacentHTML('afterbegin', settingsHTML);
		}

		this.initializeAddSellerButton();
	}

	/**
	 * Initializes the add seller button functionality
	 * @private
	 */
	static initializeAddSellerButton() {
		const addSellerButton = document.getElementById('CMUSCaddSellerButton');
		const addSellerInput = document.getElementById('CMUSCaddSellerInput');

		if (addSellerButton && addSellerInput) {
			addSellerButton.addEventListener('click', () => {
				const sellerName = Utilities.sanitizeHTML(addSellerInput.value.trim());

				if (sellerName) {
					let lSellers = this.getStoredSellers();

					if (!lSellers.includes(sellerName)) {
						lSellers.push(sellerName);
						localStorage.setItem(CONFIG.STORAGE_KEY.SELLERS, JSON.stringify(lSellers));
						addSellerInput.value = '';
					}
				}

				this.updateSellers();
			});
		}
	}

}

/**
 * Page Navigation Module
 */
class PageNavigator {
	/**
	 * Initializes page-specific functionality
	 */
	static init() {
		const currentPath = document.location.pathname;

		if (currentPath.endsWith(`${CONFIG.LANGUAGE}/Magic/ShoppingCart`)) {
			ShoppingCart.init();
		} else {
			Utilities.displayMessage("Cardmarket Utilities: No functionality defined for this page.", true);
		}
	}
}

// Initialize the application
PageNavigator.init();
