'use strict';

angular
	.module(
		'npPage',
		[ ]
	);

angular
	.module('npPage')

	/** @ngInject */
	.controller( 'npPageController',
		function( $log, $scope, $state, ManifestService, ConfigService )
		{
			$log.debug( 'npPage::this component', $scope.component,
			            'is page', $scope.component.data.id,
			            'inside content scope', $scope.currentContent,
			            'for page', ManifestService.getPageId() );

			var parentIdx = $scope.component.idx.slice(0);
			parentIdx.pop();

			var pageId = ManifestService.getPageId();
			if ( !pageId )
			{
				var firstPageCmp = ManifestService.getFirst('npPage', parentIdx);
				pageId = firstPageCmp.data.id;
				ManifestService.setPageId( pageId );
				$log.debug('npPage::set page', pageId);
				/* redirecting interrupts component loading
				$state.go(
					'manifest.lang.page',
					{
						lang: ManifestService.getLang(),
						pageId: pageId
					},
					{
						location: 'replace'
					}
				);
				*/
			}

			// have pages been indexed?
			if ( ! $scope.currentContent.pages )
			{
				// index pages
				var pages = ManifestService.getAll( 'npPage', parentIdx );
				var nestedPages = [];
				for (var pageIdx in pages)
				{
					var page = pages[pageIdx];
					$log.debug( 'npPage::index:', page );
					if ( !!page.data && page.data.inMenu )
					{
						var aPage =
							{
								id : page.data.id,
								link : '#/' + ConfigService.getManifestId() + '/' + page.data.id,
								text : page.data.menuTitle || page.data.title,
								children : []
							};
						var parentId = page.data.parentId;
						$log.debug( 'npPage::index:parent?', parentId );
						if ( ! parentId )
						{
							$log.debug( 'npPage::index:top level:', aPage );
							nestedPages.push( aPage );
						} else {
							$log.debug( 'npPage::index:nest:', parentId, aPage );
							for ( var parentPage in nestedPages )
							{
								$log.debug( 'npPage::index:nest:isEqual?', parentId, nestedPages[parentPage].id );
								if ( nestedPages[parentPage].id === parentId )
								{
									nestedPages[parentPage].children.push( aPage );
								}
							}
						}
					}
				}
				$log.debug( 'npPage::index results:', nestedPages );
				$scope.currentContent.pages = nestedPages;
			}


			// check if current route is for this page
			$log.debug( 'npPage::on current page?', ManifestService.getPageId(), $scope.component.data.id );
			if ( $scope.component.data.id === pageId )
			{
				$scope.currentPage = true;
				$scope.npPage = $scope;

			} else {
				$scope.currentPage = false;
			}
		}
	)

	/** @ngInject */
	.run(
		function( $log, $rootScope )
		{
			$log.debug('npPage::component loaded!');
		}
	);

