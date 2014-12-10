'use strict';

/* ===========================================================

 pipwerks SCORM Wrapper for JavaScript
 v1.1.20140217

 Created by Philip Hutchison, January 2008-2014
 https://github.com/pipwerks/scorm-api-wrapper

 Angular Service adaption by Creative Few
 http://creativefew.com/

 Copyright (c) Philip Hutchison
 MIT-style license: http://pipwerks.mit-license.org/

 This wrapper works with both SCORM 1.2 and SCORM 2004.

 Inspired by APIWrapper.js, created by the ADL and
 Concurrent Technologies Corporation, distributed by
 the ADL (http://www.adlnet.gov/scorm).

 SCORM.API.find() and SCORM.API.get() functions based
 on ADL code, modified by Mike Rustici
 (http://www.scorm.com/resources/apifinder/SCORMAPIFinder.htm),
 further modified by Philip Hutchison

 =============================================================== */

/** @ngInject */
function ScormDriver ( $log ) {

  $log.info('ScormDriver::Init');


  var pipwerks = {};
  pipwerks.UTILS = {};                                //For holding UTILS functions
  pipwerks.debug = {isActive: true};                //Enable (true) or disable (false) for debug mode

  pipwerks.SCORM = {                                  //Define the SCORM object
    version: null,                               //Store SCORM version.
    handleCompletionStatus: true,                   //Whether or not the wrapper should automatically handle the initial completion status
    handleExitMode: true,                           //Whether or not the wrapper should automatically handle the exit mode
    API: {
      handle: null,
      isFound: false
    },                 //Create API child object
    connection: {isActive: false},                //Create connection child object
    data: {
      completionStatus: null,
      exitStatus: null
    },               //Create data child object
    debug: {}                                  //Create debug child object
  };

  /* --------------------------------------------------------------------------------
   pipwerks.SCORM.isAvailable
   A simple function to allow Flash ExternalInterface to confirm
   presence of JS wrapper before attempting any LMS communication.

   Parameters: none
   Returns:    Boolean (true)
   ----------------------------------------------------------------------------------- */

  pipwerks.SCORM.isAvailable = function () {
    return true;
  };

// ------------------------------------------------------------------------- //
// --- SCORM.API functions ------------------------------------------------- //
// ------------------------------------------------------------------------- //

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.API.find(window)
   Looks for an object named API in parent and opener windows

   Parameters: window (the browser window object).
   Returns:    Object if API is found, null if no API found
   ---------------------------------------------------------------------------- */

  pipwerks.SCORM.API.find = function ( win ) {

    var API = null,
      findAttempts = 0,
      findAttemptLimit = 500,
      traceMsgPrefix = 'SCORM.API.find',
      scorm = pipwerks.SCORM;

    while ( (!win.API && !win.API_1484_11) &&
    (win.parent) &&
    (win.parent !== win) &&
    (findAttempts <= findAttemptLimit) ) {

      findAttempts++;
      win = win.parent;

    }

    //If SCORM version is specified by user, look for specific API
    if ( scorm.version ) {

      switch ( scorm.version ) {

        case '2004' :

          if ( win.API_1484_11 ) {

            API = win.API_1484_11;

          } else {

            $log.debug ( traceMsgPrefix + ': SCORM version 2004 was specified by user, but API_1484_11 cannot be found.' );

          }

          break;

        case '1.2' :

          if ( win.API ) {

            API = win.API;

          } else {

            $log.debug ( traceMsgPrefix + ': SCORM version 1.2 was specified by user, but API cannot be found.' );

          }

          break;

      }

    } else {                             //If SCORM version not specified by user, look for APIs

      if ( win.API_1484_11 ) {            //SCORM 2004-specific API.

        scorm.version = '2004';      //Set version
        API = win.API_1484_11;

      } else if ( win.API ) {              //SCORM 1.2-specific API

        scorm.version = '1.2';       //Set version
        API = win.API;

      }

    }

    if ( API ) {

      $log.debug ( traceMsgPrefix + ': API found. Version: ' + scorm.version );
      $log.debug ( 'API: ' + API );

    } else {

      $log.debug ( traceMsgPrefix + ': Error finding API. \nFind attempts: ' + findAttempts + '. \nFind attempt limit: ' + findAttemptLimit );

    }

    return API;

  };

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.API.get()
   Looks for an object named API, first in the current window's frame
   hierarchy and then, if necessary, in the current window's opener window
   hierarchy (if there is an opener window).

   Parameters:  None.
   Returns:     Object if API found, null if no API found
   ---------------------------------------------------------------------------- */

  pipwerks.SCORM.API.get = function () {

    var API = null,
      win = window,
      scorm = pipwerks.SCORM,
      find = scorm.API.find;

    if ( win.parent && win.parent !== win ) {
      API = find ( win.parent );
    }

    if ( !API && win.top.opener ) {
      API = find ( win.top.opener );
    }

    //Special handling for Plateau
    //Thanks to Joseph Venditti for the patch
    if ( !API && win.top.opener && win.top.opener.document ) {
      API = find ( win.top.opener.document );
    }

    if ( API ) {
      scorm.API.isFound = true;
    } else {
      $log.debug ( 'API.get failed: Can\'t find the API!' );
    }

    return API;

  };

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.API.getHandle()
   Returns the handle to API object if it was previously set

   Parameters:  None.
   Returns:     Object (the pipwerks.SCORM.API.handle variable).
   ---------------------------------------------------------------------------- */

  pipwerks.SCORM.API.getHandle = function () {

    var API = pipwerks.SCORM.API;

    if ( !API.handle && !API.isFound ) {

      API.handle = API.get ();

    }

    return API.handle;

  };

// ------------------------------------------------------------------------- //
// --- pipwerks.SCORM.connection functions --------------------------------- //
// ------------------------------------------------------------------------- //

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.connection.initialize()
   Tells the LMS to initiate the communication session.

   Parameters:  None
   Returns:     Boolean
   ---------------------------------------------------------------------------- */

  pipwerks.SCORM.connection.initialize = function () {

    var success = false,
      scorm = pipwerks.SCORM,
      completionStatus = scorm.data.completionStatus,
      makeBoolean = pipwerks.UTILS.StringToBoolean,
      debug = scorm.debug,
      traceMsgPrefix = 'SCORM.connection.initialize ';

    $log.debug ( 'connection.initialize called.' );

    if ( !scorm.connection.isActive ) {

      var API = scorm.API.getHandle (),
        errorCode = 0;

      if ( API ) {

        switch ( scorm.version ) {
          case '1.2' :
            success = makeBoolean ( API.LMSInitialize ( '' ) );
            break;
          case '2004':
            success = makeBoolean ( API.Initialize ( '' ) );
            break;
        }

        if ( success ) {

          //Double-check that connection is active and working before returning 'true' boolean
          errorCode = debug.getCode ();

          if ( errorCode !== null && errorCode === 0 ) {

            scorm.connection.isActive = true;

            if ( scorm.handleCompletionStatus ) {

              //Automatically set new launches to incomplete
              completionStatus = scorm.status ( 'get' );

              if ( completionStatus ) {

                switch ( completionStatus ) {

                  //Both SCORM 1.2 and 2004
                  case 'not attempted':
                    scorm.status ( 'set', 'incomplete' );
                    break;

                  //SCORM 2004 only
                  case 'unknown' :
                    scorm.status ( 'set', 'incomplete' );
                    break;

                  //Additional options, presented here in case you'd like to use them
                  //case 'completed'  : break;
                  //case 'incomplete' : break;
                  //case 'passed'     : break;    //SCORM 1.2 only
                  //case 'failed'     : break;    //SCORM 1.2 only
                  //case 'browsed'    : break;    //SCORM 1.2 only

                }

              }

            }

          } else {

            success = false;
            $log.debug ( traceMsgPrefix + 'failed. \nError code: ' + errorCode + ' \nError info: ' + debug.getInfo ( errorCode ) );

          }

        } else {

          errorCode = debug.getCode ();

          if ( errorCode !== null && errorCode !== 0 ) {

            $log.debug ( traceMsgPrefix + 'failed. \nError code: ' + errorCode + ' \nError info: ' + debug.getInfo ( errorCode ) );

          } else {

            $log.debug ( traceMsgPrefix + 'failed: No response from server.' );

          }
        }

      } else {

        $log.debug ( traceMsgPrefix + 'failed: API is null.' );

      }

    } else {

      $log.debug ( traceMsgPrefix + 'aborted: Connection already active.' );

    }

    return success;

  };

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.connection.terminate()
   Tells the LMS to terminate the communication session

   Parameters:  None
   Returns:     Boolean
   ---------------------------------------------------------------------------- */

  pipwerks.SCORM.connection.terminate = function () {

    var success = false,
      scorm = pipwerks.SCORM,
      exitStatus = scorm.data.exitStatus,
      completionStatus = scorm.data.completionStatus,
      makeBoolean = pipwerks.UTILS.StringToBoolean,
      debug = scorm.debug,
      traceMsgPrefix = 'SCORM.connection.terminate ';

    if ( scorm.connection.isActive ) {

      var API = scorm.API.getHandle (),
        errorCode = 0;

      if ( API ) {

        if ( scorm.handleExitMode && !exitStatus ) {

          if ( completionStatus !== 'completed' && completionStatus !== 'passed' ) {

            switch ( scorm.version ) {
              case '1.2' :
                success = scorm.set ( 'cmi.core.exit', 'suspend' );
                break;
              case '2004':
                success = scorm.set ( 'cmi.exit', 'suspend' );
                break;
            }

          } else {

            switch ( scorm.version ) {
              case '1.2' :
                success = scorm.set ( 'cmi.core.exit', 'logout' );
                break;
              case '2004':
                success = scorm.set ( 'cmi.exit', 'normal' );
                break;
            }

          }

        }

        //Ensure we persist the data
        success = scorm.save ();

        if ( success ) {

          switch ( scorm.version ) {
            case '1.2' :
              success = makeBoolean ( API.LMSFinish ( '' ) );
              break;
            case '2004':
              success = makeBoolean ( API.Terminate ( '' ) );
              break;
          }

          if ( success ) {

            scorm.connection.isActive = false;

          } else {

            errorCode = debug.getCode ();
            $log.debug ( traceMsgPrefix + 'failed. \nError code: ' + errorCode + ' \nError info: ' + debug.getInfo ( errorCode ) );

          }

        }

      } else {

        $log.debug ( traceMsgPrefix + 'failed: API is null.' );

      }

    } else {

      $log.debug ( traceMsgPrefix + 'aborted: Connection already terminated.' );

    }

    return success;

  };

// ------------------------------------------------------------------------- //
// --- pipwerks.SCORM.data functions --------------------------------------- //
// ------------------------------------------------------------------------- //

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.data.get(parameter)
   Requests information from the LMS.

   Parameter: parameter (string, name of the SCORM data model element)
   Returns:   string (the value of the specified data model element)
   ---------------------------------------------------------------------------- */

  pipwerks.SCORM.data.get = function ( parameter ) {

    var value = null,
      scorm = pipwerks.SCORM,
      debug = scorm.debug,
      traceMsgPrefix = 'SCORM.data.get(' + parameter + ') ';

    if ( scorm.connection.isActive ) {

      var API = scorm.API.getHandle (),
        errorCode = 0;

      if ( API ) {

        switch ( scorm.version ) {
          case '1.2' :
            value = API.LMSGetValue ( parameter );
            break;
          case '2004':
            value = API.GetValue ( parameter );
            break;
        }

        errorCode = debug.getCode ();

        //GetValue returns an empty string on errors
        //If value is an empty string, check errorCode to make sure there are no errors
        if ( value !== '' || errorCode === 0 ) {

          //GetValue is successful.
          //If parameter is lesson_status/completion_status or exit status, let's
          //grab the value and cache it so we can check it during connection.terminate()
          switch ( parameter ) {

            case 'cmi.core.lesson_status':
            case 'cmi.completion_status' :
              scorm.data.completionStatus = value;
              break;

            case 'cmi.core.exit':
            case 'cmi.exit'     :
              scorm.data.exitStatus = value;
              break;

          }

        } else {

          $log.debug ( traceMsgPrefix + 'failed. \nError code: ' + errorCode + '\nError info: ' + debug.getInfo ( errorCode ) );

        }

      } else {

        $log.debug ( traceMsgPrefix + 'failed: API is null.' );

      }

    } else {

      $log.debug ( traceMsgPrefix + 'failed: API connection is inactive.' );

    }

    $log.debug ( traceMsgPrefix + ' value: ' + value );

    return String ( value );

  };

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.data.set()
   Tells the LMS to assign the value to the named data model element.
   Also stores the SCO's completion status in a variable named
   pipwerks.SCORM.data.completionStatus. This variable is checked whenever
   pipwerks.SCORM.connection.terminate() is invoked.

   Parameters: parameter (string). The data model element
   value (string). The value for the data model element
   Returns:    Boolean
   ---------------------------------------------------------------------------- */

  pipwerks.SCORM.data.set = function ( parameter, value ) {

    var success = false,
      scorm = pipwerks.SCORM,
      makeBoolean = pipwerks.UTILS.StringToBoolean,
      debug = scorm.debug,
      traceMsgPrefix = 'SCORM.data.set(' + parameter + ') ';

    if ( scorm.connection.isActive ) {

      var API = scorm.API.getHandle (),
        errorCode = 0;

      if ( API ) {

        switch ( scorm.version ) {
          case '1.2' :
            success = makeBoolean ( API.LMSSetValue ( parameter, value ) );
            break;
          case '2004':
            success = makeBoolean ( API.SetValue ( parameter, value ) );
            break;
        }

        if ( success ) {

          if ( parameter === 'cmi.core.lesson_status' || parameter === 'cmi.completion_status' ) {

            scorm.data.completionStatus = value;

          }

        } else {

          $log.debug ( traceMsgPrefix + 'failed. \nError code: ' + errorCode + '. \nError info: ' + debug.getInfo ( errorCode ) );

        }

      } else {

        $log.debug ( traceMsgPrefix + 'failed: API is null.' );

      }

    } else {

      $log.debug ( traceMsgPrefix + 'failed: API connection is inactive.' );

    }

    return success;

  };

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.data.save()
   Instructs the LMS to persist all data to this point in the session

   Parameters: None
   Returns:    Boolean
   ---------------------------------------------------------------------------- */

  pipwerks.SCORM.data.save = function () {

    var success = false,
      scorm = pipwerks.SCORM,
      makeBoolean = pipwerks.UTILS.StringToBoolean,
      traceMsgPrefix = 'SCORM.data.save failed';

    if ( scorm.connection.isActive ) {

      var API = scorm.API.getHandle ();

      if ( API ) {

        switch ( scorm.version ) {
          case '1.2' :
            success = makeBoolean ( API.LMSCommit ( '' ) );
            break;
          case '2004':
            success = makeBoolean ( API.Commit ( '' ) );
            break;
        }

      } else {

        $log.debug ( traceMsgPrefix + ': API is null.' );

      }

    } else {

      $log.debug ( traceMsgPrefix + ': API connection is inactive.' );

    }

    return success;

  };

  pipwerks.SCORM.status = function ( action, status ) {

    var success = false,
      scorm = pipwerks.SCORM,
      traceMsgPrefix = 'SCORM.getStatus failed',
      cmi = '';

    if ( action !== null ) {

      switch ( scorm.version ) {
        case '1.2' :
          cmi = 'cmi.core.lesson_status';
          break;
        case '2004':
          cmi = 'cmi.completion_status';
          break;
      }

      switch ( action ) {

        case 'get':
          success = scorm.data.get ( cmi );
          break;

        case 'set':
          if ( status !== null ) {

            success = scorm.data.set ( cmi, status );

          } else {

            success = false;
            $log.debug ( traceMsgPrefix + ': status was not specified.' );

          }

          break;

        default      :
          success = false;
          $log.debug ( traceMsgPrefix + ': no valid action was specified.' );

      }

    } else {

      $log.debug ( traceMsgPrefix + ': action was not specified.' );

    }

    return success;

  };

// ------------------------------------------------------------------------- //
// --- pipwerks.SCORM.debug functions -------------------------------------- //
// ------------------------------------------------------------------------- //

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.debug.getCode
   Requests the error code for the current error state from the LMS

   Parameters: None
   Returns:    Integer (the last error code).
   ---------------------------------------------------------------------------- */

  pipwerks.SCORM.debug.getCode = function () {

    var scorm = pipwerks.SCORM,
      API = scorm.API.getHandle (),
      code = 0;

    if ( API ) {

      switch ( scorm.version ) {
        case '1.2' :
          code = parseInt ( API.LMSGetLastError (), 10 );
          break;
        case '2004':
          code = parseInt ( API.GetLastError (), 10 );
          break;
      }

    } else {

      $log.debug ( 'SCORM.debug.getCode failed: API is null.' );

    }

    return code;

  };

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.debug.getInfo()
   'Used by a SCO to request the textual description for the error code
   specified by the value of [errorCode].'

   Parameters: errorCode (integer).
   Returns:    String.
   ----------------------------------------------------------------------------- */

  pipwerks.SCORM.debug.getInfo = function ( errorCode ) {

    var scorm = pipwerks.SCORM,
      API = scorm.API.getHandle (),
      result = '';

    if ( API ) {

      switch ( scorm.version ) {
        case '1.2' :
          result = API.LMSGetErrorString ( errorCode.toString () );
          break;
        case '2004':
          result = API.GetErrorString ( errorCode.toString () );
          break;
      }

    } else {

      $log.debug ( 'SCORM.debug.getInfo failed: API is null.' );

    }

    return String ( result );

  };

  /* -------------------------------------------------------------------------
   pipwerks.SCORM.debug.getDiagnosticInfo
   'Exists for LMS specific use. It allows the LMS to define additional
   diagnostic information through the API Instance.'

   Parameters: errorCode (integer).
   Returns:    String (Additional diagnostic information about the given error code).
   ---------------------------------------------------------------------------- */

  pipwerks.SCORM.debug.getDiagnosticInfo = function ( errorCode ) {

    var scorm = pipwerks.SCORM,
      API = scorm.API.getHandle (),
      result = '';

    if ( API ) {

      switch ( scorm.version ) {
        case '1.2' :
          result = API.LMSGetDiagnostic ( errorCode );
          break;
        case '2004':
          result = API.GetDiagnostic ( errorCode );
          break;
      }

    } else {

      $log.debug ( 'SCORM.debug.getDiagnosticInfo failed: API is null.' );

    }

    return String ( result );

  };

// ------------------------------------------------------------------------- //
// --- Shortcuts! ---------------------------------------------------------- //
// ------------------------------------------------------------------------- //

// Because nobody likes typing verbose code.

  pipwerks.SCORM.init = pipwerks.SCORM.connection.initialize;
  pipwerks.SCORM.get = pipwerks.SCORM.data.get;
  pipwerks.SCORM.set = pipwerks.SCORM.data.set;
  pipwerks.SCORM.save = pipwerks.SCORM.data.save;
  pipwerks.SCORM.quit = pipwerks.SCORM.connection.terminate;

// ------------------------------------------------------------------------- //
// --- pipwerks.UTILS functions -------------------------------------------- //
// ------------------------------------------------------------------------- //

  /* -------------------------------------------------------------------------
   pipwerks.UTILS.StringToBoolean()
   Converts 'boolean strings' into actual valid booleans.

   (Most values returned from the API are the strings 'true' and 'false'.)

   Parameters: String
   Returns:    Boolean
   ---------------------------------------------------------------------------- */

  pipwerks.UTILS.StringToBoolean = function ( value ) {
    var t = typeof value;
    switch ( t ) {
      //typeof new String('true') === 'object', so handle objects as string via fall-through.
      //See https://github.com/pipwerks/scorm-api-wrapper/issues/3
      case 'object':
      case 'string':
        return (/(true|1)/i).test ( value );
      case 'number':
        return !!value;
      case 'boolean':
        return value;
      case 'undefined':
        return null;
      default:
        return false;
    }
  };

  var isAvailable = false;
  var student = {};
  var scorm = pipwerks.SCORM.init();
  var constants = {
      name: 'ScormDriver',
      SCORM_NOT_CONNECTED: 'SCORM_NOT_CONNECTED'
    };

  if ( scorm ) {
    isAvailable = true;
    student.language = scorm.get ( 'cmi.core.user_language_preference' );
    student.name = scorm.get ( 'cmi.core.student_name' );
  }
  
  /**
   * Returns whether the lesson is complete per cmi.core.lesson_status.
   *
   * @return bool 
   */
  function isLessonComplete() {
      if ( !isAvailable ) {
        throw constants.SCORM_NOT_CONNECTED;
      }

      var completionstatus = scorm.get ( 'cmi.core.lesson_status' );

      return (completionstatus === 'completed' || completionstatus === 'passed');
    }
  
  /**
   * Sets the lesson completion status  per cmi.core.lesson_status.
   *
   * @param bool isComplete Whether the lesson is or is not complete
   * @return bool Whether the status was able to be set.
   */
  function setLessonComplete( isComplete ) {
      if ( !isAvailable ) {
        throw constants.SCORM_NOT_CONNECTED;
      }

      var lessonStatus = isComplete ? 'completed' : '';

      if ( scorm.set ( 'cmi.core.lesson_status', lessonStatus ) ) {
        return true;
      }

      $log.error ( 'Could not set lesson status', lessonStatus);
      return false;
    }
  
  /**
   * Returns the student's progress data.
   *
   * @return string? JSON progress data
   */
  function getProgress() {
      if ( !isAvailable ) {
        throw constants.SCORM_NOT_CONNECTED;
      }

      return scorm.get('cmi.suspend_data');
    }

  /**
   * Stores the student's progress data
   *
   * @param suspendData string? the data to be stored
   * @return bool Whether the state was able to be set.
   */
  function setProgress( suspendData ) {
      if ( !isAvailable ) {
        throw constants.SCORM_NOT_CONNECTED;
      }

      if ( scorm.set ( 'cmi.suspend_data', suspendData ) ) {
        return true;
      }

      $log.error ( 'Could not set suspendData', suspendData );
      return false;
    }

  return {

    //----- 'Constants'
    constants: constants,
    //----- Vars
    isAvailable: isAvailable,
    get: scorm.get,
    set: scorm.set,
    save: scorm.save,
    student: student,

    //----- Functions
    isLessonComplete: isLessonComplete,
    setLessonComplete: setLessonComplete,
    getProgress: getProgress,
    setProgress: setProgress 
  };

}
