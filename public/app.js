import moment from 'moment';
import chrome from 'ui/chrome';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';

import 'ui/autoload/all';
import './less/main.less';
import template from './templates/index.html';
import settingsTemplate from './templates/settings.html';
import filtersTemplate from './templates/filters.html';

const MAX_MESSAGES = 1000;

uiRoutes.enable();
uiRoutes
.when('/', {
  template,
});

uiModules
.get('app/logwhale', [])
.controller('logwhale', function ($scope, $route, $interval, $timeout, $http) {

  // The index to query for log data.
  $scope.esIndex = 'beatname-*';
  // The maximum number of records to return
  $scope.maxRecords = 100;

  // Timestamp used for for display and sorting of entries.
  $scope.timestampField = '@timestamp';
  // Timezone to convert the timestamp into.
  $scope.timestampZone = 'local';
  // Format for displaying the timestamp.
  $scope.timestampFormat = 'MMM DD HH:mm:ss';

  // The message field to display.
  $scope.messageField = 'message';

  // A map of tags to the actual field name in ElasticSearch.
  $scope.tagMap = {
    'hostname': 'hostname',
    'namespace': 'docker.io.kubernetes.pod.namespace',
    'pod': 'docker.io.kubernetes.pod.name',
    'container': 'docker.io.kubernetes.container.name'
  };
  // Map of tags to a value to filter them to.
  $scope.tagFilters = {};
  // List of tags to display between the timestamp + message.
  $scope.tagView = ['namespace', 'pod'];

  // How often should we try to fetch new logs?
  $scope.refreshIntervalSecs = 5;
  // Should we actually continaully refresh and try to tail the logs?
  $scope.tail = true;

  // The messages to display.
  $scope.messages = [];

  // The message ids that are already in the messages list.
  let messageMap = {};
  let appendMessages = (msgs) => {
    msgs.forEach((msg) => {
      if (!msg.id) {
        msg.id = msg.timestamp;
      }
      if (!messageMap[msg.id]) {
        messageMap[msg.id] = true;
        let finalMsg = msg;
        finalMsg.displayTimestamp = moment.utc(msg.timestamp).local().format($scope.timestampFormat);
        $scope.messages.push(finalMsg);
      }
    });
    // Clean up if we have over 1k messages to prevent browser explosions!
    if ($scope.messages.length > MAX_MESSAGES) {
      let toDrop = $scope.messages.length - MAX_MESSAGES;
      $scope.messages.slice(0, toDrop).map((msg) => {
        delete messageMap[msg.id];
      });
      $scope.messages = $scope.messages.slice(toDrop);
    }
  };

  $scope.startTailing = () => {
    // Run the scroll after the DOM updates to ensure pretty animations happen.
    $timeout(() => {
      $('#logwhale-container').animate({
        scrollTop: document.getElementById('logwhale-container').scrollHeight
      }, 1000);
    }, 0);
  };

  let refreshTimeout = null;

  $scope.refresh = (force) => {
    if (!force && !$scope.tail) {
      // Only refresh if we are tailing the logs.
      return;
    }
    if (force) {
      // Clear the message list on force refresh.
      $scope.messages = [];
      messageMap = {};
    }
    if (refreshTimeout) {
      $timeout.cancel(refreshTimeout);
      refreshTimeout = null;
    }
    // Sure I would have loved to do this with ng-model but that didn't work.
    let searchEl = document.getElementById('logwhale-search');
    $http.post(chrome.addBasePath('/api/logwhale/search'), {
      index: $scope.esIndex,
      search: searchEl ? searchEl.value : '',
      maxRecords: $scope.maxRecords,
      messageField: $scope.messageField,
      timestampField: $scope.timestampField,
      tagMap: $scope.tagMap,
      tagFilters: $scope.tagFilters,
    }).then((resp) => {
      // Only update the messages if the user didn't pause mid-flight.
      if (force || $scope.tail) {
        // Reverse the list that arrived in descending timestamp order and
        // Decorate the messages with the "displayTimestamp".
        appendMessages(resp.data.messages.reverse());
        if ($scope.tail) {
          refreshTimeout = $timeout($scope.refresh, $scope.refreshIntervalSecs * 1000);
          $scope.startTailing();
        }
      }
    });
  };
  // Refresh the message list on load.
  $scope.refresh();

  // Top right navigation menu.
  $scope.topNavMenu =
    [{
      key: 'filters',
      description: 'Active Filters',
      template: filtersTemplate,
      testId: 'logwhaleFiltersButton',
    }, {
      key: 'settings',
      description: 'Settings',
      template: settingsTemplate,
      testId: 'logwhaleSettingsButton',
    }, {
      key: 'refresh',
      description: 'Refresh',
      run: () => { $scope.refresh(true) },
      testId: 'logwhaleSettingsButton',
    }, {
      key: 'pause',
      description: 'Toggle Tailing',
      run: () => {
        $scope.tail = !$scope.tail;
        if ($scope.tail) {
          $scope.refresh();
          $scope.startTailing();
        }
      },
      testId: 'logwhaleLiveButton',
    }];
  $scope.$watch('tail', () => {
    // Okay so for some reason to change stuff in the top nav
    // we have to do this because simply updating the topNavMenu
    // like you would expect doesn't work. ¯\_(ツ)_/¯
    $scope.kbnTopNav.menuItems[3].label = $scope.tail ? 'Pause' : 'Go Live';
  });

  $scope.addFilter = (tag, value) => {
    $scope.tagFilters[tag] = value;
    $scope.refresh(true);
  };

  $scope.removeFilter = (tag) => {
    delete $scope.tagFilters[tag];
    $scope.refresh(true);
  };

});
