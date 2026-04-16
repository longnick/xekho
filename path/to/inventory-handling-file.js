// Update the inventory item selection mechanism to use a dropdown source tied to data.js instead of manual input.

const dropdown = document.getElementById('inventoryDropdown');

// Fetch items from data.js (assuming it exports an array of objects with item names)
import { items } from './data.js';

function populateDropdown() {
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name; // assuming item.name contains the inventory item name
        option.textContent = item.name;
        dropdown.appendChild(option);
    });
}

function handleInventoryEdit() {
    const selectedItem = dropdown.value;
    // Further logic for handling inventory edits using selectedItem instead of manual inputs
}

// Initialize the dropdown on page load.
populateDropdown();
// Add event listener for inventory edits
dropdown.addEventListener('change', handleInventoryEdit);