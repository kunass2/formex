/**
 * Copyright (c) Bartłomiej Semańczyk - bartekss2@gmail.com http://www.blue-world.pl
 * @version 1.1
 * Last Update: Sunday, 18 January 2015
*/

(function($) {
	'use strict';

	var classnames = {
		main: "veryform",
		elem: "veryform-item",
		wrap: 'veryform-wrap',
		warning: 'veryform-warning',
		positive: 'veryform-true',
		negative: 'veryform-false',
		failure: 'veryform-failure',
		success: 'veryform-success',
		js: 'js-veryform'
	};

	if (window.veryform === undefined) {
		window.veryform = {};
	}
	window.veryform.classnames = classnames;

	function _(str) {
		var dot = ".";
		return dot + str + ' ';
	}

	var Veryform = (function() {

		var regex = { //to extend
			text: '/[^\\s]+/i',
			email: '/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/i',
			checkbox: 1,
			textarea: '/[^\\s]+/i',
			radio: 1,
			select: 1,
			file: true,
			password: '/[^\\s]+/i'
		};

		var warnings = {
			text: 'nothing was written',
			email: 'incorrect email',
			checkbox: 'choose something',
			textarea: 'nothing was written',
			radio: 'choose something',
			select: 'choose something',
			file: 'choose the file',
			password: 'incorrect password'
		};

		var Formex_Class = function(instance, opts) {
			this.$instance;
			this.elems;
			this.datas = {};
			this.defaults = {
				wrap: true,
				displayWarnings: true,
				maxFileSize: 5000000,
				validateOnSubmit: true,
				init: true,
				autoinit: false,
				on: 'keyup',
				exclude: '',
				autocomplete: false,
				regex: {},
				warnings: {}
			};

			this.elemsCounter = 0;

			this.updateOptions(opts);

			this.$instance = instance;
			if (typeof instance === 'string') {
				this.$instance = $(instance);
			}

			if (this.defaults.init) {
				this.init();
			}
		};


		Formex_Class.prototype.updateOptions = function(opts) {
			opts ? $.extend(this.defaults, opts) : '';
		};

		Formex_Class.prototype.init = function() {
			var that = this;

			that.elems = that.$instance.find('input[type!=submit][type!=hidden][type!=reset], textarea, select');

			that.elems.each(function(){
				that.add($(this));
			});

			that.setHandlers();
		};

		Formex_Class.prototype.add = function(elem) {
			var type = elem.attr('type');
			var name = elem.attr('name');
			switch (type) {
				case 'radio' :
				case 'checkbox' :
					if (!name) {
						this.elems = this.elems.not(elem);
						elem.remove();
						return;
					}
					break;
				default:
			}

			this.setData(elem);
			this.wrap(elem);
			this.appendWarning(elem);
			this.setShouldbe(elem);
			this.valid(elem);

			if (this.defaults.autoinit) {
				this.valid(elem);
				this.performAction(elem);
				this.checkGlobalStatus();
			}

			if (this.$instance.find(this.defaults.exclude).is(elem)) {
				this.exclude(elem);
			}
		};

		Formex_Class.prototype.setData = function(elem) {
			var that = this;

			that.repairType(elem);

			var name = elem.attr('name');
			var type = elem.attr('type');

			var elemdata = {};
			var data = {};
			elemdata['id'] = this.elemsCounter;
			elemdata['data'] = data;
			elemdata['validOnStart'] = false;

			for (var i in this.datas.elems) {
				if (this.datas.elems[i]['data']['name'] == name) {

					this.datas.elems[i]['data']['sum']++;

					elemdata['data'] = this.datas.elems[i]['data'];
					this.datas.elems.push(elemdata);
					elem.data(window.veryform.classnames.main, elemdata);
					that.applyHandler(elem);
					this.elemsCounter++;
					return;
				}
			}

			data['elem'] = elem;
			data['type'] = type ? type : elem[0]['localName'];
			data['name'] = name;
			data['valid'] = false;
			data['sum'] = 1; //elems with the same name
			data['is'] = 0;
			data['wrapped'] = false;
			data['shouldbe'] = 0;
			data['eventHandler'] = undefined;
			data['eventName'] = undefined;

			!that.datas.elems ? that.datas.elems = [] : '';
			that.datas.elems.push(elemdata);
			elem.data(window.veryform.classnames.main, elemdata);
			that.elemsCounter++;

			that.applyRegex(elem);
			that.applyWarnings(elem);
			that.repairRegex(elem);
			that.applyHandler(elem);

			elem.addClass(window.veryform.classnames.elem);
			elem.removeAttr('required');
			!that.defaults.autocomplete ? elem.attr('autocomplete', 'off') : '';
		};

		Formex_Class.prototype.applyRegex = function(elem) {
			var that = this;
			var data = elem.data(window.veryform.classnames.main);
			for (var i in that.defaults.regex) {
				if (that.$instance.find(i).is(elem)) {
					that.setDataParameter(elem, 'regex', that.defaults.regex[i]);
					that.repairRegex(elem);
					return;
				}
			}
			that.setDataParameter(elem, 'regex', regex[data['data']['type']]);
			that.repairRegex(elem);
		};

		Formex_Class.prototype.applyWarnings = function(elem) {
			var that = this;
			var data = elem.data(window.veryform.classnames.main);
			for (var i in that.defaults.warnings) {
				if (that.$instance.find(i).is(elem)) {
					that.setDataParameter(elem, 'warning', that.defaults.warnings[i]);
					return;
				};
			}
			that.setDataParameter(elem, 'warning', warnings[data['data']['type']]);
		};

		Formex_Class.prototype.exclude = function(elems) {
			var that = this;
			elems.each(function(){
				var data = $(this).data(window.veryform.classnames.main);
				that.off($(this), data['data']['eventName'], data['data']['eventHandler']);
				data['data']['sum']--;
				for (var i in that.datas.elems) {
					var index = parseInt(i);
					if (that.datas.elems[index]['id'] == data['id']) {
						that.datas.elems.splice(index, 1);
						break;
					}
				}
				$(this).removeData(window.veryform.classnames.main);
			});
		};

		Formex_Class.prototype.setDataParameter = function(elem, key, value) {
			var data = elem.data(window.veryform.classnames.main);
			data['data'][key] = value;
		};

		Formex_Class.prototype.repairType = function(elem) {

			elem[0]['localName'] == 'input' && !elem.attr('type') ? elem.attr('type', 'text') : '';
		};

		Formex_Class.prototype.repairRegex = function(elem) {
			var that = this;
			var data = elem.data(window.veryform.classnames.main);
			var type = data['data']['type'];
			var rgx = data['data']['regex'];
			switch (type) {
				case 'text' :
				case 'textarea' :
				case 'email':
				case 'password':
					!rgx.match(/^\/.*\/[img]{1,3}/g) ? that.setDataParameter(elem, 'regex', regex[type]): '';
				break;

				case 'radio':
				case 'checkbox':
				case 'select':
					isNaN(rgx) ? that.setDataParameter(elem, 'regex', regex[type]): '';
				break;

				case 'file':
					rgx !== true && rgx !== false ? that.setDataParameter(elem, 'regex', regex[type]): '';
				break;
			}
		};

		Formex_Class.prototype.setShouldbe = function(elem) {
			var that = this;
			var data = elem.data(window.veryform.classnames.main);

			switch (data['data']['type']) {
				case 'radio' :
				case 'checkbox' :
					data['data']['shouldbe'] = data['data']['regex'];
				break;
				case 'select' :
					data['data']['shouldbe'] = data['data']['regex'];
				break;
				case 'file' :
					data['data']['shouldbe'] = data['data']['regex'] == true ? 1 : 0;
					data['data']['maxFileSize'] = that.defaults.maxFileSize;
				break;
				default: data['data']['shouldbe']++;
				break;
			}
		};

		Formex_Class.prototype.valid = function(elem) {
			var that = this;
			var data = elem.data(window.veryform.classnames.main);
			var validOnStart = data['validOnStart'];

			switch (data['data']['type']) {
				case 'text':
				case 'email':
				case 'password':
				case 'textarea':
					var regex = data['data']['regex'].match(/\/(.*)\/(.*)/);
					var value = elem.val();
					var regex_object = new RegExp(regex[1], regex[2]);
					data['data']['is'] = value.match(regex_object) ? Math.min(++data['data']['is'], 1) : Math.max(--data['data']['is'], 0);
				break;
				case 'radio':
					elem.is(':checked') ? data['data']['is'] = 1 : validOnStart ? data['data']['is'] = 0 : '';
				break;
				case 'checkbox':
					elem.is(':checked') ? data['data']['is']++ : validOnStart ? data['data']['is']-- : '';
				break;
				case 'select':
					var value = elem.val();
					data['data']['is'] = value.match(/.+/i) ? 1 : 0;
				break;
				case 'file':
					var value = elem.val();
					data['data']['is'] = value.length > 0 && data['data']['recentFileSize'] && (data['recentFileSize'] <= data['maxFileSize']) ? 1 : 0;
				break;
			}
			data['validOnStart'] = true;
			that.checkStatus(elem);
		};

		Formex_Class.prototype.checkStatus = function(elem) {
			var data = elem.data(window.veryform.classnames.main);
			data['data']['valid'] = data['data']['is'] >= data['data']['shouldbe'] ? true : false;
		};

		Formex_Class.prototype.performAction = function(elem) {
			var data = elem.data(window.veryform.classnames.main);
			data['data']['valid'] ? elem.trigger('ontrue') : elem.trigger('onfalse');
		};

		Formex_Class.prototype.wrap = function(elem) {
			var that = this;
			var data = elem.data(window.veryform.classnames.main);
			var type = data['data']['type'];
			var name = data['data']['name'];
			var elems = undefined;
			if (that.defaults.wrap && !data['data']['wrapped']) {
				var elemsToWrap = $();
				switch (type) {
					case 'radio':
					case 'checkbox':
						elems = $('[name=' + name + ']');
					break;
					default: elems = elem;
				}

				var wrapper = $('<div class="' + window.veryform.classnames.wrap + ' veryform_' + data['data']['name'] + ' veryform_' + data['data']['type'] + '" />');

				elemsToWrap = elemsToWrap.add(elems);

				elems.each(function(){
					elemsToWrap = elemsToWrap.add($(this).parents('form').find('label[for=' + $(this).attr('id') + ']'));
				});

				elemsToWrap.wrapAll(wrapper);
				data['data']['wrapped'] = true;
			}
		};

		Formex_Class.prototype.appendWarning = function(elem) {
			var that = this;
			var data = elem.data(window.veryform.classnames.main);
			var $warning = $('<span>').addClass(window.veryform.classnames.warning).text(data['data']['warning']).css('display', 'none');
			var $wrapper = elem.parents(_(window.veryform.classnames.wrap));
			if (!$wrapper.find(_(window.veryform.classnames.warning)).length) {
				$wrapper.append($warning);
			}
		};

		Formex_Class.prototype.on = function(elem, eventName, eventHandler) {
			elem.on(eventName, eventHandler);
		};

		Formex_Class.prototype.off = function(elem, eventName, eventHandler) {
			elem.off(eventName, eventHandler);
		};

		Formex_Class.prototype.applyHandler = function(elem) {
			var that = this;
			var data = elem.data(window.veryform.classnames.main);
			var type = data['data']['type'];
			var eventHandler = undefined;
			var eventName = undefined;

			switch (type) {
				case 'radio':
				case 'checkbox':
				case 'select':
					eventName = 'change init';
					eventHandler = function() {
						that.valid(elem);
						that.performAction(elem);
						that.checkGlobalStatus();
					}
				break;

				case 'text':
				case 'email':
				case 'password':
				case 'textarea':
					eventName = that.defaults.on + ' init';
					eventHandler = function(event) {
						var which = event.which;
						if (which != 9) {
							that.valid(elem);
							that.performAction(elem);
							that.checkGlobalStatus();
						}
					}
				break;

				case 'file':
					eventName = 'change click init';
					eventHandler = function() {
						var filesize = this.files[0] ? this.files[0].size/1024 : undefined;
						data['data']['recentFileSize'] = filesize;
						that.valid(elem);
						that.performAction(elem);
						that.checkGlobalStatus();
					}
				break;
			}
			data['data']['eventName'] = eventName
			data['data']['eventHandler'] = eventHandler;
			that.on(elem, eventName, eventHandler);
			that.on(elem, 'ontrue', function(){
				if (that.defaults.displayWarnings) {
					elem.parents(_(window.veryform.classnames.wrap)).find(_(window.veryform.classnames.warning)).hide(300);
					elem.parents(_(window.veryform.classnames.wrap)).removeClass(window.veryform.classnames.negative).addClass(window.veryform.classnames.positive);
				}
			});
			that.on(elem, 'onfalse', function(){
				if (that.defaults.displayWarnings) {
					elem.parents(_(window.veryform.classnames.wrap)).find(_(window.veryform.classnames.warning)).show(300);
					elem.parents(_(window.veryform.classnames.wrap)).removeClass(window.veryform.classnames.positive).addClass(window.veryform.classnames.negative);
				}
			})
		};

		Formex_Class.prototype.setHandlers = function(event) {
			var that = this;
			if (that.defaults.validateOnSubmit) {
				that.$instance.submit(function(e) {
					var focused = false;
					var error = false;

					for (var i in that.datas.elems) {
						if (!that.datas.elems[i]['data']['valid']) {
							error = true;
							var elem = that.datas.elems[i]['data']['elem'];
							elem.trigger('onfalse');
							if (!focused) {
								elem.focus();
								focused = true;
							}
						}
					}
					if (error) {
						e.preventDefault();
						e.stopPropagation();
						e.stopImmediatePropagation();
					}
				});
			}
		};

		Formex_Class.prototype.checkGlobalStatus = function() {
			var that = this;
			var isSuccess = true;
			for (var i in that.datas.elems) {
				if (!that.datas.elems[i]['data']['valid']) {
					isSuccess = false;
					that.$instance.removeClass(window.veryform.classnames.success).addClass(window.veryform.classnames.failure);
					return;
				}
			}
			that.$instance.removeClass(window.veryform.classnames.failure).addClass(window.veryform.classnames.success);
		};

		return Formex_Class;
	})();

	window.Veryform = Veryform;

	var auto_veryform_instances = $(_(window.veryform.classnames.js));
	auto_veryform_instances.each(function(){
		var instance = $(this);
		var options = JSON.parse(instance.attr('data-veryform-options'));
		var veryform = new Veryform(instance, options);
		$(this).data(window.veryform.classnames.main, veryform);
	});

	$.fn.veryform = function(opts) {
		$(this).each(function(){
			var instance = $(this);
			var veryform = new Veryform(instance, opts);
			$(this).addClass(window.veryform.classnames.js);
			$(this).data(window.veryform.classnames.main, veryform);
		});
	};

}(jQuery));