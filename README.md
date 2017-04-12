# DigitalPianism_AjaxLogin

Ajax Login &amp; Registration via Popup module for Magento

# Documentation

Everything you need to know can be found here: http://www.digital-pianism.com/en/magento-modules/ajax-popup-login.html

# Magento Connect

https://www.magentocommerce.com/magento-connect/ajax-popup-for-login-registration.html

# Release Notes

## 0.3.1

- Fix a bug where the module would not work with confirmation email enabled: https://github.com/digitalpianism/ajaxlogin/issues/2

## 0.3.0

- Secure all controller calls to use HTTPS
- Implement CORS to be able to call the controller from HTTP

## 0.2.7

- Fix a bug where the meta title of every page would be set to "Create New Customer Account"

## 0.2.6

- Fix a bug where customer registration would not work on Magento < 1.9.0.1

## 0.2.5

- Fix a bug where customer registration would not work on Magento < 1.9.1.0
- Add missing _getUrl to the controller
- Add the popup to the my account link when customer is not logged in
