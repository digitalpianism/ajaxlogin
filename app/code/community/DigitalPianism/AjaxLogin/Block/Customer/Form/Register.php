<?php

/**
 * Class DigitalPianism_AjaxLogin_Block_Customer_Form_Register
 */
class DigitalPianism_AjaxLogin_Block_Customer_Form_Register
    extends Mage_Customer_Block_Form_Register
{
    /**
     * Small hack to avoid the meta title to be set to "Create New Customer Account" on all pages
     * @return Mage_Core_Block_Abstract
     */
    protected function _prepareLayout()
    {
        return Mage_Directory_Block_Data::_prepareLayout();
    }
}