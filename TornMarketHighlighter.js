// ==UserScript==
// @name         Torn Market Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  A script that highlights the price depending on the seller's status, hospital, traveling, jailed, ok
// @author       3xtr
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// Check if the current page is the market page
if (window.location.href.includes('ItemMarket')) {

    // Function to create the API Key input box and display it in the desired position on the market page
    function createApiKeyInputBox() {
        console.log("Creating API Key Input Box...");

        // Create the input container, spacing because OCD or whatever
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex'; // Use flex to input field with the submit button
        inputContainer.style.alignItems = 'center';
        inputContainer.style.marginTop = '10px'; // Space from the "Item Market" header
        inputContainer.style.marginBottom = '10px'; // Space below the input box
        inputContainer.style.justifyContent = 'flex-start'; // Align to the left

        // Create the input field, styling stuff
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.placeholder = 'Enter your Torn API Key';
        inputField.style.width = '140px'; // Set a fixed width that fits better
        inputField.style.backgroundColor = '#111111';
        inputField.style.padding = '8px';
        inputField.style.color = '#adadad';
        inputField.style.border = '1px solid #323232';
        inputField.style.borderRadius = '4px';

        // Pre-fill the input field if there's an API key already stored
        const storedApiKey = localStorage.getItem('publicTornKey');
        if (storedApiKey) {
            inputField.value = storedApiKey;
        }

        // Create the submit button, styling etc
        const submitButton = document.createElement('button');
        submitButton.innerText = 'Submit';
        submitButton.style.padding = '8px 16px';
        submitButton.style.border = 'none';
        submitButton.style.backgroundColor = '#333333';
        submitButton.style.color = 'white';
        submitButton.style.borderRadius = '4px';
        submitButton.style.cursor = 'pointer';
        submitButton.style.marginLeft = '10px'; // Space between input and button

        // Add event listener for the submit button
        submitButton.addEventListener('click', () => {
            const apiKey = inputField.value.trim();
            if (apiKey) {
                // Store the API key in localStorage
                localStorage.setItem('publicTornKey', apiKey);
                alert('API Key saved, please reload the page!');
            } else {
                alert('Please enter a valid API key.');
            }
        });

        // Wait for the necessary elements to load
        const interval = setInterval(() => {
            const header = document.querySelector('h4'); // The "Item Market" header
            const addListingButton = document.querySelector('a.linkContainer___X16y4[aria-labelledby="Add Listings"]'); // The "Add Listings" button

            if (header && addListingButton) {
                // Insert the input box before the "Add Listings" button
                clearInterval(interval); // Stop checking once we have the elements

                // Insert the API key input box before the "Add Listings" button
                addListingButton.parentNode.insertBefore(inputContainer, addListingButton);

                // Append the input field and button to the container
                inputContainer.appendChild(inputField);
                inputContainer.appendChild(submitButton);

                console.log("API Key Input Box Created.");
            }
        }, 100); // Check every 100ms until elements are found
    }

    createApiKeyInputBox();

    // Get the API key from localStorage, to be stored through the input field above
    let apiKey = localStorage.getItem('publicTornKey');

    // Function to highlight the price of an item depending on the seller's status
    function sellerStatus() {
        document.querySelectorAll('a[href*="XID="]').forEach(anchor => {
            const profileUrl = anchor.href;
            const match = profileUrl.match(/XID=(\d+)/);
            if (match) {
                const userId = match[1];
                fetch(`https://api.torn.com/user/${userId}?selections=profile&key=${apiKey}&comment=attack_stats`)
                    .then(async response => {
                        let user = await response.json() || {};

                        // Use a general querySelector to match any row class that starts with "rowWrapper"
                        const row = anchor.closest('[class^="rowWrapper"]');
                        if (row) {
                            // Use a general querySelector to match any price class that starts with "price__"
                            const priceElement = row.querySelector('[class^="price__"]');
                            if (priceElement) {
                                const state = user.status?.state?.toLowerCase();

                                if (state === 'hospital' || state === 'federal') {
                                    priceElement.style.color = 'red';
                                }
                                else if (state === 'abroad' || state === 'traveling') {
                                    priceElement.style.color = 'cyan';
                                }
                                else if (state === 'okay') {
                                    priceElement.style.color = 'green';
                                }
                            }
                        }
                    })
                    .catch(err => {
                        console.error("Error fetching user data for userId:", userId, err);
                    });
            }
        });
    }

    // Update the script when a new seller adds an item
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) {
                    // If new node is a seller then
                    if (node.matches?.('[class^="rowWrapper"]') || node.querySelector?.('[class^="rowWrapper"]')) {
                        // Recolour the seller prices
                        requestIdleCallback(sellerStatus, { timeout: 500 });
                        return;
                    }
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Run the function initially to apply the styles
    sellerStatus();
}
