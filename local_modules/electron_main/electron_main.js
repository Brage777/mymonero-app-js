// Copyright (c) 2014-2017, MyMonero.com
//
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification, are
// permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of
//	conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list
//	of conditions and the following disclaimer in the documentation and/or other
//	materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its contributors may be
//	used to endorse or promote products derived from this software without specific
//	prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
// THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
// THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
"use strict"
//	
const {crashReporter, app} = require('electron')
if (process.env.NODE_ENV !== 'development') {
	{ // Crash reporting
		const options_template = require('../reporting/crashReporterOptions.electron')
		const options = JSON.parse(JSON.stringify(options_template)) // quick n dirty copy
		options.extra.process = "electron_main"
		crashReporter.start(options)
		/* Commented this for now to check whether crash reported relays exceptions
		process.on('uncaughtException', function(error) { // We're going to observe this here (for electron especially) so that the exceptions are prevented from bubbling up to the UI.
			console.error("Observed uncaught exception", error) // TODO: re-emit and send this to the error reporting service?
		})
		*/	
	}
	{ // Exception reporting
		const Raven = require('raven')
		const appVersion = app.getVersion()
		const options = require('../reporting/exceptionReporterOptions.electron')(appVersion, "electron_main")
		const sentry_dsn = options.sentry_dsn
		const raven_params = 
		{
			autoBreadcrumbs: options.autoBreadcrumbs,
			release: options.release,
			environment: options.environment,
			extra: options.extra
		}
		Raven.config(sentry_dsn, raven_params).install()
	}
}
{ // `app` configuration
	const appId = "com.mymonero.mymonero" // aka bundle id; NOTE: cannot currently access package.json in production pkging (cause of asar?… needs a little work)
	app.setAppUserModelId(appId) // for Windows, primarily; before any windows set up
}
{ // Application
	const context = require('./electron_main_context').NewHydratedContext(app) // electron app can be accessed at context.app; context is injected into instances of classes described in ./electron_main_context.js
	module.exports = context
	global.context = context
}
var shouldQuit = app.makeSingleInstance( // ensure only one instance of the app can be run... not only for UX reasons but so we don't get any conditions which might mess with db sanity
	function(argv, workingDirectory)
	{ // Single instance context being passed control when user attempted to launch duplicate instance. Emit event so that main window may be focused
		app.emit('launched-duplicatively', argv) // custom event
	}
)
if (shouldQuit) { // would be true if this is a duplicative app instance
	console.log("💬  Will quit as app should be single-instance.")
	app.quit()
	return
}