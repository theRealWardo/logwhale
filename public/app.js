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
.controller('logwhale', function ($scope, $route, $interval, $http) {

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
  // Note that this can be false to disable refreshing.
  $scope.refreshIntervalSecs = 5;

  // Search term for filtering messages.
  $scope.search = '';

  $scope.messages = [];
  $scope.refresh = () => {
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
    });
  };
  // Refresh the message list on load.
  $scope.refresh();
  // Continually refresh based on the refresh interval.
  const unsubscribe = $interval($scope.refresh, $scope.refreshIntervalSecs * 1000);
  $scope.$watch('$destroy', unsubscribe);

  // Top right navigation menu.
  $scope.topNavMenu = [{
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
    run: $scope.refresh,
    testId: 'logwhaleSettingsButton',
  }];

  $scope.addFilter = (tag, value) => {
    $scope.tagFilters[tag] = value;
    $scope.refresh();
  };

});
