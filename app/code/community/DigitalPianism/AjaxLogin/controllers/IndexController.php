<?php

class DigitalPianism_AjaxLogin_IndexController extends Mage_Core_Controller_Front_Action
{

    /**
     * Get Url method
     *
     * @param string $url
     * @param array $params
     * @return string
     */
    protected function _getUrl($url, $params = array())
    {
        return Mage::getUrl($url, $params);
    }

    /**
     * Get Customer Model
     *
     * @return Mage_Customer_Model_Customer
     */
    protected function _getCustomer()
    {
        $customer = Mage::registry('current_customer');
        if (!$customer) {
            $customer = Mage::getModel('customer/customer')->setId(null);
        }
        if ($this->getRequest()->getParam('is_subscribed', false)) {
            $customer->setIsSubscribed(1);
        }
        /**
         * Initialize customer group id
         */
        $customer->getGroupId();

        return $customer;
    }

    /**
     * Validate customer data and return errors if they are
     *
     * @param Mage_Customer_Model_Customer $customer
     * @return array|string
     */
    protected function _getCustomerErrors($customer)
    {
        $errors = array();
        $request = $this->getRequest();
        if ($request->getPost('create_address')) {
            $errors = $this->_getErrorsOnCustomerAddress($customer);
        }
        $customerForm = $this->_getCustomerForm($customer);
        $customerData = $customerForm->extractData($request);
        $customerErrors = $customerForm->validateData($customerData);
        if ($customerErrors !== true) {
            $errors = array_merge($customerErrors, $errors);
        } else {
            $customerForm->compactData($customerData);
            $customer->setPassword($request->getPost('password'));
            // Password confirmation field name has changed since 1.9.1.0
            if (version_compare(Mage::getVersion(),"1.9.1.0",">="))
            {
                $customer->setPasswordConfirmation($request->getPost('confirmation'));
            }
            else
            {
                $customer->setConfirmation($request->getPost('confirmation'));
            }
            $customerErrors = $customer->validate();
            if (is_array($customerErrors)) {
                $errors = array_merge($customerErrors, $errors);
            }
        }
        return $errors;
    }

    /**
     * Get Customer Form Initalized Model
     *
     * @param Mage_Customer_Model_Customer $customer
     * @return Mage_Customer_Model_Form
     */
    protected function _getCustomerForm($customer)
    {
        /* @var $customerForm Mage_Customer_Model_Form */
        $customerForm = Mage::getModel('customer/form');
        $customerForm->setFormCode('customer_account_create');
        $customerForm->setEntity($customer);
        return $customerForm;
    }

    /**
     * Gets customer address
     *
     * @param $customer
     * @return array $errors
     */
    protected function _getErrorsOnCustomerAddress($customer)
    {
        $errors = array();
        /* @var $address Mage_Customer_Model_Address */
        $address = Mage::getModel('customer/address');
        /* @var $addressForm Mage_Customer_Model_Form */
        $addressForm = Mage::getModel('customer/form');
        $addressForm->setFormCode('customer_register_address')
            ->setEntity($address);

        $addressData = $addressForm->extractData($this->getRequest(), 'address', false);
        $addressErrors = $addressForm->validateData($addressData);
        if (is_array($addressErrors)) {
            $errors = array_merge($errors, $addressErrors);
        }
        $address->setId(null)
            ->setIsDefaultBilling($this->getRequest()->getParam('default_billing', false))
            ->setIsDefaultShipping($this->getRequest()->getParam('default_shipping', false));
        $addressForm->compactData($addressData);
        $customer->addAddress($address);

        $addressErrors = $address->validate();
        if (is_array($addressErrors)) {
            $errors = array_merge($errors, $addressErrors);
        }
        return $errors;
    }

    /**
     * Success Registration
     *
     * @param Mage_Customer_Model_Customer $customer
     * @return Mage_Customer_AccountController
     */
    protected function _successProcessRegistration(Mage_Customer_Model_Customer $customer)
    {
        $session = Mage::getSingleton('customer/session');
        if ($customer->isConfirmationRequired()) {
            /** @var $app Mage_Core_Model_App */
            $app = $this->_getApp();
            /** @var $store  Mage_Core_Model_Store*/
            $store = $app->getStore();
            $customer->sendNewAccountEmail(
                'confirmation',
                $session->getBeforeAuthUrl(),
                $store->getId()
            );
            $customerHelper = Mage::helper('customer');
            $session->addSuccess($this->__('Account confirmation is required. Please, check your email for the confirmation link. To resend the confirmation email please <a href="%s">click here</a>.',
                $customerHelper->getEmailConfirmationUrl($customer->getEmail())));
            $url = $this->_getUrl('customer/account/index', array('_secure' => true));
        } else {
            $session->setCustomerAsLoggedIn($customer);
            $url = $this->_welcomeCustomer($customer);
        }
        return $url;
    }

    /**
     * Add welcome message and send new account email.
     * Returns success URL
     *
     * @param Mage_Customer_Model_Customer $customer
     * @param bool $isJustConfirmed
     * @return string
     */
    protected function _welcomeCustomer(Mage_Customer_Model_Customer $customer, $isJustConfirmed = false)
    {
        Mage::getSingleton('customer/session')->addSuccess(
            $this->__('Thank you for registering with %s.', Mage::app()->getStore()->getFrontendName())
        );
        if (Mage::helper('customer/address')->isVatValidationEnabled()) {
            // Show corresponding VAT message to customer
            $configAddressType =  Mage::helper('customer/address')->getTaxCalculationAddressType();
            $userPrompt = '';
            switch ($configAddressType) {
                case Mage_Customer_Model_Address_Abstract::TYPE_SHIPPING:
                    $userPrompt = $this->__('If you are a registered VAT customer, please click <a href="%s">here</a> to enter you shipping address for proper VAT calculation',
                        $this->_getUrl('customer/address/edit'));
                    break;
                default:
                    $userPrompt = $this->__('If you are a registered VAT customer, please click <a href="%s">here</a> to enter you billing address for proper VAT calculation',
                        $this->_getUrl('customer/address/edit'));
            }
            Mage::getSingleton('customer/session')->addSuccess($userPrompt);
        }

        $customer->sendNewAccountEmail(
            $isJustConfirmed ? 'confirmed' : 'registered',
            '',
            Mage::app()->getStore()->getId()
        );

        $successUrl = Mage::getUrl('customer/account/index', array('_secure' => true));
        if (Mage::getSingleton('customer/session')->getBeforeAuthUrl()) {
            $successUrl = Mage::getSingleton('customer/session')->getBeforeAuthUrl(true);
        }
        return $successUrl;
    }

    /**
     * Add session error method
     *
     * @param string|array $errors
     */
    protected function _addSessionError($errors)
    {
        $session = Mage::getSingleton('customer/session');
        $session->setCustomerFormData($this->getRequest()->getPost());
        if (is_array($errors)) {
            foreach ($errors as $errorMessage) {
                $session->addError($errorMessage);
            }
        } else {
            $session->addError($this->__('Invalid customer data'));
        }
    }

    public function createAction()
    {
        // Clear the messages each time we call it
        Mage::getSingleton('core/session')->getMessages(true);

        if (version_compare(Mage::getVersion(),"1.9.2.2",">="))
        {
            // Only from 1.9.2.2
            if (!$this->_validateFormKey()) {
                return;
            }
        }

        $session = Mage::getSingleton('customer/session');

        if ($session->isLoggedIn()) {
            return;
        }

        $session->setEscapeMessages(true); // prevent XSS injection in user input
        if (!$this->getRequest()->isPost()) {
            return;
        }

        $result = array(
            'success' => false
        );

        $customer = $this->_getCustomer();

        try {
            $errors = $this->_getCustomerErrors($customer);

            if (empty($errors)) {
                if (version_compare(Mage::getVersion(),"1.9.1.0",">="))
                {
                    // Only from 1.9.1.0
                    $customer->cleanPasswordsValidationData();
                }
                $customer->save();
                Mage::dispatchEvent('customer_register_success',
                    array('account_controller' => $this, 'customer' => $customer)
                );
                $result['redirect'] = $this->_successProcessRegistration($customer);
                $result['success'] = true;
            } else {
                $result['error'] = $errors;
                $this->_addSessionError($errors);
            }
        } catch (Mage_Core_Exception $e) {
            $session->setCustomerFormData($this->getRequest()->getPost());
            if ($e->getCode() === Mage_Customer_Model_Customer::EXCEPTION_EMAIL_EXISTS) {
                $url = Mage::getUrl('customer/account/forgotpassword');
                $message = $this->__('There is already an account with this email address. If you are sure that it is your email address, <a href="%s">click here</a> to get your password and access your account.', $url);
                $session->setEscapeMessages(false);
            } else {
                $message = $e->getMessage();
            }
            $result['error'] = $message;
        } catch (Exception $e) {
            $result['error'] = $this->__('Cannot save the customer.');
        }

        $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($result));
    }

    public function forgotpasswordAction()
    {
        $session = Mage::getSingleton('customer/session');

        if ($session->isLoggedIn()) {
            return;
        }

        $email = $this->getRequest()->getPost('email');
        $result = array(
            'success' => false
        );
        if ($email) {
            if (!Zend_Validate::is($email, 'EmailAddress')) {
                $session->setForgottenEmail($email);
                $result['error'] = Mage::helper('checkout')->__('Invalid email address.');
            } else {
                $customer = Mage::getModel('customer/customer')
                    ->setWebsiteId(Mage::app()->getStore()->getWebsiteId())
                    ->loadByEmail($email);

                if ($customer->getId()) {
                    try {
                        $customerHelper = Mage::helper('customer');
                        if (method_exists($customerHelper, 'generateResetPasswordLinkToken')) {
                            $newResetPasswordLinkToken = Mage::helper('customer')->generateResetPasswordLinkToken();
                            $customer->changeResetPasswordLinkToken($newResetPasswordLinkToken);
                            $customer->sendPasswordResetConfirmationEmail();
                        } else {
                            // 1.6.0.x and earlier
                            $newPassword = $customer->generatePassword();
                            $customer->changePassword($newPassword, false);
                            $customer->sendPasswordReminderEmail();
                            $result['message'] = Mage::helper('customer')->__('A new password has been sent.');
                        }
                        $result['success'] = true;
                    } catch (Exception $e) {
                        $result['error'] = $e->getMessage();
                    }
                }
                if (!isset($result['message']) && ($result['success'] || !$customer->getId())) {
                    $result['message'] = Mage::helper('customer')->__('If there is an account associated with %s you will receive an email with a link to reset your password.', Mage::helper('customer')->escapeHtml($email));
                }
            }
        } else {
            $result['error'] = Mage::helper('customer')->__('Please enter your email.');
        }

        $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($result));
    }

    public function loginAction()
    {
        $session = Mage::getSingleton('customer/session');

        if ($session->isLoggedIn()) {
            return;
        }

        $result = array(
            'success' => false
        );

        if ($this->getRequest()->isPost()) {
            $login = $this->getRequest()->getPost('login');
            if (!empty($login['username']) && !empty($login['password'])) {
                try {
                    $session->login($login['username'], $login['password']);
                    $result['redirect'] = $this->_getRefererUrl() ? $this->_getRefererUrl() : Mage::getUrl('customer/account', array('_secure' => true));
                    $result['success'] = true;
                } catch (Mage_Core_Exception $e) {
                    switch ($e->getCode()) {
                        case Mage_Customer_Model_Customer::EXCEPTION_EMAIL_NOT_CONFIRMED:
                            $message = Mage::helper('customer')->__('This account is not confirmed. <a href="%s">Click here</a> to resend confirmation email.', Mage::helper('customer')->getEmailConfirmationUrl($login['username']));
                            break;
                        case Mage_Customer_Model_Customer::EXCEPTION_INVALID_EMAIL_OR_PASSWORD:
                            $message = $e->getMessage();
                            break;
                        default:
                            $message = $e->getMessage();
                    }
                    $result['error'] = $message;
                    $session->setUsername($login['username']);
                } catch (Exception $e) {
                    Mage::helper("ajaxlogin")->log("There has been an error during the login.");
                    // Mage::logException($e); // PA DSS violation: this exception log can disclose customer password
                }
            } else {
                $result['error'] = Mage::helper('customer')->__('Login and password are required.');
            }
        }

        $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($result));
    }

    public function logoutAction()
    {
        $session = Mage::getSingleton('customer/session');

        if (!$session->isLoggedIn()) {
            return;
        }

        $session->logout()->renewSession();
        $result['redirect'] = Mage::getUrl('customer/account/logoutSuccess', array('_secure' => true));
        $result['success'] = true;

        $this->getResponse()->setBody(Mage::helper('core')->jsonEncode($result));
    }
}