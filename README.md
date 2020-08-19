dtest log timing analyzer
==============

Getting Started:
----------------

- 1. This is an node js based utility to analyze the session report which got generated from dtest automation tool.
- 2. Change in the logging text of dtest application may have impact on this report generation or it may lead to incorrect report.

Usage Manual:
--------------

*Pre-requisite: npm should be install in the machine.*

- 1. Extract the code into a folder(log-analyzer)
- 2. Open command prompt and move to log-analyzer directory
- 3. Execute **npm install**
- 4. Copy logs folder inside log-analyzer directory. 
- 4. Execute **npm start**
- 5. To generate csv report for all the log files, access http://localhost:2999/performance/sessions from browser. Report will be in ./log-analyzer/reprots directory.
- 6. To generate csv report for all specific session log file, access http://localhost:2999/performance/session/sessionId from browser. sessionId in teh url should be actual sessionid and there must be log file persent in logs directory for this session. Report will be in ./log-analyzer/reprots directory.

Know Issues:
-------------

- 1. While accessing the URL there won't be any content in the browser. Only the title will get changed to *Performance Report*. The actual intention of the project is to show the report in browser along with the save as csv option. As of now, directly data will be save into /report/****_reprot.csv file without any data in the browser.

Contacts:
------------
