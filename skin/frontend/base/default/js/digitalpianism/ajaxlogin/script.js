/**
 * Created by Raph on 10/11/2014.
 */
AjaxLogin = Class.create();
AjaxLogin.prototype = {
    initialize: function(config) {
        this.config = Object.extend({
            triggers: null,
            markup:
            '<div class="d-shadow-wrap">'
            +   '<div class="content"></div>'
            +   '<div class="d-sh-cn d-sh-tl"></div><div class="d-sh-cn d-sh-tr"></div>'
            + '</div>'
            + '<div class="d-sh-cn d-sh-bl"></div><div class="d-sh-cn d-sh-br"></div>'
            + '<a href="javascript:void(0)" class="close"></a>'
        }, config || {});
        this.config.size = Object.extend({
            width    : 'auto',
            height   : 'auto',
            maxWidth : 550,
            maxHeight: 600
        }, this.config.size || {});

        this._prepareMarkup();
        this._attachEventListeners();
        this._addEventListeners();
    },

    show: function() {
        if (!this.centered) {
            this.center();
        }
        $$('select').invoke('addClassName', 'ajaxlogin-hidden');

        if (!$('ajaxlogin-mask')) {
            var mask = new Element('div');
            mask.writeAttribute('id', 'ajaxlogin-mask');
            var body    = document.body,
                element = document.documentElement,
                height  = Math.max(
                    Math.max(body.scrollHeight, element.scrollHeight),
                    Math.max(body.offsetHeight, element.offsetHeight),
                    Math.max(body.clientHeight, element.clientHeight)
                );
            mask.setStyle({
                height: height + 'px'
            });
            $(document.body).insert(mask);
        }

        if (!window.ajaxloginMaskCounter) {
            window.ajaxloginMaskCounter = 0;
        }
        if (!this.maskCounted) {
            this.maskCounted = 1;
            window.ajaxloginMaskCounter++;
        }

        // set highest z-index
        var zIndex = 999;
        $$('.ajaxlogin-window').each(function(el) {
            maxIndex = parseInt(el.getStyle('zIndex'));
            if (zIndex < maxIndex) {
                zIndex = maxIndex;
            }
        });
        this.window.setStyle({
            'zIndex': zIndex + 1
        });

        this._onKeyPressBind = this._onKeyPress.bind(this);
        document.observe('keyup', this._onKeyPressBind);
        this.window.show();
    },

    hide: function() {
        if (this.modal || !this.window.visible()) {
            return;
        }

        if (this._onKeyPressBind) {
            document.stopObserving('keyup', this._onKeyPressBind);
        }
        if (this.config.destroy) {
            this.window.remove();
        } else {
            this.window.hide();
        }
        this.maskCounted = 0;
        if (!--window.ajaxloginMaskCounter) {
            $('ajaxlogin-mask') && $('ajaxlogin-mask').remove();
            $$('select').invoke('removeClassName', 'ajaxlogin-hidden');
        }
    },

    setModal: function(flag) {
        this.modal = flag;

        if (flag) {
            this.window.select('.close').invoke('hide');
        } else {
            this.window.select('.close').invoke('show');
        }
        return this;
    },

    update: function(content, size) {
        var oldContent = this.content.down();
        oldContent && $(document.body).insert(oldContent.hide());

        this.content.update(content);
        content.show();
        this.addActionBar();
        this.updateSize(size);
        this.center();
        return this;
    },

    addActionBar: function() {
        this.removeActionBar();

        var agreementId = this.content.down().id.replace('-window', ''),
            trigger     = this.config.triggers[agreementId];

        if (!trigger || !trigger.actionbar) {
            return;
        }

        this.content.insert({
            after: '<div class="actionbar">' + trigger.actionbar.html + '</div>'
        });
        $(trigger.actionbar.el).observe(
            trigger.actionbar.event,
            trigger.actionbar.callback.bindAsEventListener(this, agreementId.replace('ajaxlogin-', ''))
        );
    },

    removeActionBar: function() {
        var agreementId = this.content.down().id.replace('-window', ''),
            trigger     = this.config.triggers[agreementId];

        if (trigger && trigger.actionbar) {
            var actionbar = $(trigger.actionbar.el);
            if (actionbar) {
                actionbar.stopObserving(trigger.actionbar.event);
            }
        }

        this.window.select('.actionbar').invoke('remove');
    },

    getActionBar: function() {
        return this.window.down('.actionbar');
    },

    center: function() {
        var viewportSize   = document.viewport.getDimensions(),
            viewportOffset = document.viewport.getScrollOffsets(),
            shadowWrap     = this.window.down('.d-shadow-wrap'),
            windowSize     = this.window.getDimensions(),
            left, top;

        if ('undefined' === typeof viewportSize.width) { // mobile fix. not sure is this check is good enough.
            top  = viewportOffset.top + 20;
            left = viewportOffset.left;
        } else {
            top = viewportSize.height / 2
            - windowSize.height / 2
            + viewportOffset.top
            + parseInt(shadowWrap.getStyle('margin-top'))
            + parseInt(shadowWrap.getStyle('padding-top')),
                left = viewportSize.width / 2
                - windowSize.width / 2
                + viewportOffset.left
                + parseInt(shadowWrap.getStyle('margin-left'))
                + parseInt(shadowWrap.getStyle('padding-left'));

            if (left < viewportOffset.left || windowSize.width > viewportSize.width) {
                left = viewportOffset.left;
            } else {
                left -= 20; /* right shadow */
            }
            top = (top < viewportOffset.top  ? (20 + viewportOffset.top) : top)
        }

        this.setPosition(left, top);
        this.centered = true;

        return this;
    },

    setPosition: function(x, y) {
        this.window.setStyle({
            left: x + 17 /* left border */ + 'px',
            top : y + 'px'
        });

        return this;
    },

    activate: function(trigger) {
        var trigger = this.config.triggers[trigger];
        this.update(trigger.window.show(), trigger.size).show();
    },

    updateSize: function(sizeConfig) {
        sizeConfig = sizeConfig || this.config.size;
        // reset previous size
        this.window.setStyle({
            width : 'auto',
            height: 'auto',
            left  : 0, /* thin content box fix while page is scrolled to the right */
            top   : 0
        });
        this.content.setStyle({
            width : isNaN(sizeConfig.width)  ? sizeConfig.width  : sizeConfig.width + 'px',
            height: isNaN(sizeConfig.height) ? sizeConfig.height : sizeConfig.height + 'px'
        });

        this.window.setStyle({
            visibility: 'hidden'
        }).show();

        var width        = this.content.getWidth() + 100, /* right shadow and borders */
            viewportSize = document.viewport.getDimensions();

        sizeConfig = Object.extend(this.config.size, sizeConfig || {});
        if ('auto' === sizeConfig.width
            && (width > sizeConfig.maxWidth || width > viewportSize.width)) {

            if (width > viewportSize.width && viewportSize.width < (sizeConfig.maxWidth + 100)) {
                width = viewportSize.width - 100; /* right shadow and borders */
            } else {
                width = sizeConfig.maxWidth;
            }
            this.content.setStyle({
                width: width + 'px'
            });
        }

        var actionbar       = this.getActionBar(),
            actionbarHeight = actionbar ? actionbar.getHeight() : 0,
            height          = this.content.getHeight() + actionbarHeight + 20 /* top button */;
        if ('auto' === sizeConfig.height
            && (height > sizeConfig.maxHeight || height > viewportSize.height)) {

            if (height > viewportSize.height && viewportSize.height < (sizeConfig.maxHeight + actionbarHeight + 20)) {
                height = viewportSize.height - 60; /* bottom shadow */
            } else {
                height = sizeConfig.maxHeight;
            }
            height -= actionbarHeight;
            this.content.setStyle({
                height: height + 'px'
            });
        }

        // update window size. Fix for all IE browsers
        var paddingHorizontal = parseInt(this.content.getStyle('padding-left')) + parseInt(this.content.getStyle('padding-right'));
        //var paddingVertical   = parseInt(this.content.getStyle('padding-top')) + parseInt(this.content.getStyle('padding-bottom'));
        this.window.hide()
            .setStyle({
                width     : width + paddingHorizontal + 'px',
//                height    : height + paddingVertical + 'px',
                visibility: 'visible'
            });

        return this;
    },

    _prepareMarkup: function() {
        this.window = new Element('div');
        this.window.addClassName('ajaxlogin-window');
        this.window.update(this.config.markup).hide();
        this.content = this.window.select('.content')[0];
        this.close   = this.window.select('.close')[0];
        $(document.body).insert(this.window);
    },

    _attachEventListeners: function() {
        // close window
        this.close.observe('click', this.hide.bind(this));
        // show window
        if (this.config.triggers) {
            for (var i in this.config.triggers) {
                var trigger = this.config.triggers[i];
                if (typeof trigger === 'function') {
                    continue;
                }
                trigger.size = trigger.size || {};
                for (var j in this.config.size) {
                    if (trigger.size[j]) {
                        continue;
                    }
                    trigger.size[j] = this.config.size[j];
                }

                trigger.el.each(function(el) {
                    var t = trigger;
                    el.observe(t.event, function(e) {
                        if (typeof event != 'undefined') { // ie9 fix
                            event.preventDefault ? event.preventDefault() : event.returnValue = false;
                        }
                        Event.stop(e);
                        if (!t.window) {
                            return;
                        }
                        this.update(t.window, t.size).show();
                    }.bind(this));
                }.bind(this));
            }
        }
    },

    _addEventListeners: function() {
        var self = this;

        $('ajaxlogin-login-form') && $('ajaxlogin-login-form').observe('submit', function(e) {
            if (typeof event != 'undefined') { // ie9 fix
                event.preventDefault ? event.preventDefault() : event.returnValue = false;
            }
            Event.stop(e);

            if (!ajaxLoginForm.validator.validate()) {
                return false;
            }

            $('login-please-wait').show();
            $('send2').setAttribute('disabled', 'disabled');
            $$('#ajaxlogin-login-form .buttons-set')[0]
                .addClassName('disabled')
                .setOpacity(0.5);

            new Ajax.Request($('ajaxlogin-login-form').action, {
                parameters: $('ajaxlogin-login-form').serialize(),
                onSuccess: function(transport) {
                    var section = $('ajaxlogin-login-form');
                    if (!section) {
                        return;
                    }
                    var ul = section.select('.messages')[0];
                    if (ul) {
                        ul.remove();
                    }

                    var response = transport.responseText.evalJSON();
                    if (response.error) {
                        var section = $('ajaxlogin-login-form');
                        if (!section) {
                            return;
                        }
                        var ul = section.select('.messages')[0];
                        if (!ul) {
                            section.insert({
                                top: '<ul class="messages"></ul>'
                            });
                            ul = section.select('.messages')[0]
                        }
                        var li = $(ul).select('.error-msg')[0];
                        if (!li) {
                            $(ul).insert({
                                top: '<li class="error-msg"><ul></ul></li>'
                            });
                            li = $(ul).select('.error-msg')[0];
                        }
                        $(li).select('ul')[0].insert(
                            '<li>' + response.error + '</li>'
                        );
                        self.updateCaptcha('user_login');
                    }
                    if (response.redirect) {
                        document.location = response.redirect;
                        return;
                    }
                    $('login-please-wait').hide();
                    $('send2').removeAttribute('disabled');
                    $$('#ajaxlogin-login-form .buttons-set')[0]
                        .removeClassName('disabled')
                        .setOpacity(1);
                }
            });
        });

        $('ajaxlogin-create-form') && $('ajaxlogin-create-form').observe('submit', function(e) {
            if (typeof event != 'undefined') { // ie9 fix
                event.preventDefault ? event.preventDefault() : event.returnValue = false;
            }
            Event.stop(e);

            if (!ajaxCreateForm.validator.validate()) {
                return false;
            }

            $('create-please-wait').show();
            $('create').setAttribute('disabled', 'disabled');
            $$('#ajaxlogin-create-form .buttons-set')[0]
                .addClassName('disabled')
                .setOpacity(0.5);

            new Ajax.Request($('ajaxlogin-create-form').action, {
                parameters: $('ajaxlogin-create-form').serialize(),
                onSuccess: function(transport) {
                    var section = $('ajaxlogin-create-form');
                    if (!section) {
                        return;
                    }
                    var ul = section.select('.messages')[0];
                    if (ul) {
                        ul.remove();
                    }

                    var response = transport.responseText.evalJSON();
                    if (response.error) {
                        var section = $('ajaxlogin-create-form');
                        if (!section) {
                            return;
                        }
                        var ul = section.select('.messages')[0];
                        if (!ul) {
                            section.insert({
                                top: '<ul class="messages"></ul>'
                            });
                            ul = section.select('.messages')[0]
                        }
                        var li = $(ul).select('.error-msg')[0];
                        if (!li) {
                            $(ul).insert({
                                top: '<li class="error-msg"><ul></ul></li>'
                            });
                            li = $(ul).select('.error-msg')[0];
                        }
                        $(li).select('ul')[0].insert(
                            '<li>' + response.error + '</li>'
                        );
                        self.updateCaptcha('user_login');
                    }
                    if (response.redirect) {
                        document.location = response.redirect;
                        return;
                    }
                    $('create-please-wait').hide();
                    $('create').removeAttribute('disabled');
                    $$('#ajaxlogin-create-form .buttons-set')[0]
                        .removeClassName('disabled')
                        .setOpacity(1);
                }
            });
        });

        $('ajaxlogin-forgot-password-form') && $('ajaxlogin-forgot-password-form').observe('submit', function(e) {
            if (typeof event != 'undefined') { // ie9 fix
                event.preventDefault ? event.preventDefault() : event.returnValue = false;
            }
            Event.stop(e);

            if (!ajaxForgotForm.validator.validate()) {
                return false;
            }

            $('forgot-please-wait').show();
            $('btn-forgot').setAttribute('disabled', 'disabled');
            $$('#ajaxlogin-forgot-password-form .buttons-set')[0]
                .addClassName('disabled')
                .setOpacity(0.5);

            new Ajax.Request($('ajaxlogin-forgot-password-form').action, {
                parameters: $('ajaxlogin-forgot-password-form').serialize(),
                onSuccess: function(transport) {
                    var section = $('ajaxlogin-forgot-password-form');
                    if (!section) {
                        return;
                    }
                    var ul = section.select('.messages')[0];
                    if (ul) {
                        ul.remove();
                    }

                    $('forgot-please-wait').hide();
                    $('btn-forgot').removeAttribute('disabled');
                    $$('#ajaxlogin-forgot-password-form .buttons-set')[0]
                        .removeClassName('disabled')
                        .setOpacity(1);

                    var response = transport.responseText.evalJSON();

                    if (response.error) {
                        var section = $('ajaxlogin-forgot-password-form');
                        if (!section) {
                            return;
                        }
                        var ul = section.select('.messages')[0];
                        if (!ul) {
                            section.insert({
                                top: '<ul class="messages"></ul>'
                            });
                            ul = section.select('.messages')[0]
                        }
                        var li = $(ul).select('.error-msg')[0];
                        if (!li) {
                            $(ul).insert({
                                top: '<li class="error-msg"><ul></ul></li>'
                            });
                            li = $(ul).select('.error-msg')[0];
                        }
                        $(li).select('ul')[0].insert(
                            '<li>' + response.error + '</li>'
                        );
                        self.updateCaptcha('user_forgotpassword');
                    } else if (response.message) {
                        var section = $('ajaxlogin-login-form');
                        if (!section) {
                            return;
                        }
                        var ul = section.select('.messages')[0];
                        if (ul) {
                            ul.remove();
                        }
                        var section = $('ajaxlogin-login-form');
                        if (!section) {
                            return;
                        }
                        var ul = section.select('.messages')[0];
                        if (!ul) {
                            section.insert({
                                top: '<ul class="messages"></ul>'
                            });
                            ul = section.select('.messages')[0]
                        }
                        var li = $(ul).select('.success-msg')[0];
                        if (!li) {
                            $(ul).insert({
                                top: '<li class="success-msg"><ul></ul></li>'
                            });
                            li = $(ul).select('.success-msg')[0];
                        }
                        $(li).select('ul')[0].insert(
                            '<li>' + response.message + '</li>'
                        );
                        ajaxLoginWindow.activate('login');
                    }
                }
            });
        });

        $('ajaxlogin-logout-form') && $('ajaxlogin-logout-form').observe('submit', function(e) {
            if (typeof event != 'undefined') { // ie9 fix
                event.preventDefault ? event.preventDefault() : event.returnValue = false;
            }
            Event.stop(e);

            if (!ajaxLogoutForm.validator.validate()) {
                return false;
            }

            $('login-please-wait').show();
            $('send2').setAttribute('disabled', 'disabled');
            $$('#ajaxlogin-logout-form .buttons-set')[0]
                .addClassName('disabled')
                .setOpacity(0.5);

            new Ajax.Request($('ajaxlogin-logout-form').action, {
                parameters: $('ajaxlogin-logout-form').serialize(),
                onSuccess: function(transport) {
                    var section = $('ajaxlogin-logout-form');
                    if (!section) {
                        return;
                    }
                    var ul = section.select('.messages')[0];
                    if (ul) {
                        ul.remove();
                    }

                    var response = transport.responseText.evalJSON();
                    if (response.error) {
                        var section = $('ajaxlogin-logout-form');
                        if (!section) {
                            return;
                        }
                        var ul = section.select('.messages')[0];
                        if (!ul) {
                            section.insert({
                                top: '<ul class="messages"></ul>'
                            });
                            ul = section.select('.messages')[0]
                        }
                        var li = $(ul).select('.error-msg')[0];
                        if (!li) {
                            $(ul).insert({
                                top: '<li class="error-msg"><ul></ul></li>'
                            });
                            li = $(ul).select('.error-msg')[0];
                        }
                        $(li).select('ul')[0].insert(
                            '<li>' + response.error + '</li>'
                        );
                    }
                    if (response.redirect) {
                        document.location = response.redirect;
                        return;
                    }
                    $('login-please-wait').hide();
                    $('send2').removeAttribute('disabled');
                    $$('#ajaxlogin-logout-form .buttons-set')[0]
                        .removeClassName('disabled')
                        .setOpacity(1);
                }
            });
        });
    },

    ajaxFailure: function(){
        location.href = this.urls.failure;
    },

    _onKeyPress: function(e) {
        if (e.keyCode == 27) {
            this.hide();
        }
    },

    updateCaptcha: function(id) {
        var captchaEl = $(id);
        if (captchaEl) {
            captchaEl.captcha.refresh(captchaEl.previous('img.captcha-reload'));
            // try to focus input element:
            var inputEl = $('captcha_' + id);
            if (inputEl) {
                inputEl.focus();
            }
        }
    }
};