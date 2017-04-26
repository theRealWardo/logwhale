import moment from 'moment';
import chrome from 'ui/chrome';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';

import 'ui/autoload/all';
import './less/main.less';
import template from './templates/index.html';
import settingsTemplate from './templates/settings.html';
import filtersTemplate from './templates/filters.html';

uiRoutes.enable();
uiRoutes
.when('/', {
  template,
});

uiModules
.get('app/logwhale', [])
.controller('logwhale', function ($scope, $route, $interval, $timeout, $http) {

  // The index to query for log data.
  $scope.esIndex = 'logstash-*';
  // The maximum number of records to return
  $scope.maxRecords = 100;

  // Timestamp used for for display and sorting of entries.
  $scope.timestampField = '@timestamp';
  // Timezone to convert the timestamp into.
  $scope.timestampZone = 'local';
  // Format for displaying the timestamp.
  $scope.timestampFormat = 'MMM DD HH:mm:ss';

  // The message field to display.
  $scope.messageField = '@message';

  // A map of tags to the actual field name in ElasticSearch.
  $scope.tagMap = {
    'hostname': '@source_host',
    'program': '@fields.programname',
    'rancher': '@fields.io.rancher.container.name',
    'instance': '@fields.io.rancher.stack_service.name',
    'compose': '@fields.com.docker.compose.service',
    'container': '@fields.ContainerID'
  };
  // Map of tags to a value to filter them to.
  $scope.tagFilters = {};
  // List of tags to display between the timestamp + message.
  $scope.tagView = ['rancher', 'instance', 'compose', 'program'];

  // How often should we try to fetch new logs?
  $scope.refreshIntervalSecs = 5;
  // Should we actually continaully refresh and try to tail the logs?
  $scope.tail = true;

  // Search term for filtering messages.
  $scope.search = '';

  // The messages to display.
  $scope.messages = [];

  $scope.startTailing = () => {
    // Run the scroll after the DOM updates to ensure pretty animations happen.
    $timeout(() => {
      let container = document.getElementById('logwhale-container');
      $(container).animate({
        scrollTop: $(container.lastElementChild).offset().top
      }, 1000);
    }, 0);
  };

  let refreshTimeout = null;

  $scope.refresh = (force) => {
    if (!force && !$scope.tail) {
      // Only refresh if we are tailing the logs.
      return;
    }
    if (refreshTimeout) {
      $timeout.cancel(refreshTimeout);
      refreshTimeout = null;
    }
    $http.post(chrome.addBasePath('/api/logwhale/search'), {
      index: $scope.esIndex,
      search: $scope.search,
      maxRecords: $scope.maxRecords,
      messageField: $scope.messageField,
      timestampField: $scope.timestampField,
      tagMap: $scope.tagMap,
      tagFilters: $scope.tagFilters,
    }).then((resp) => {
      // Reverse the list that arrived in descending timestamp order and
      // Decorate the messages with the "displayTimestamp".
      $scope.messages = resp.data.messages.reverse().map((msg) => {
        let message = msg;
        message.displayTimestamp = moment(msg.timestamp).format($scope.timestampFormat);
        return message;
      });
      if ($scope.tail) {
        $scope.startTailing();
        refreshTimeout = $timeout($scope.refresh, $scope.refreshIntervalSecs * 1000);
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
          $scope.startTailing();
          $scope.refresh();
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
