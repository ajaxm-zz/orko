/*
 * Orko
 * Copyright © 2018-2019 Graham Crockford
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import React from "react"
import { connect } from "react-redux"

import NewRelease from "../components/NewRelease"
import * as supportActions from "../store/support/actions"
import * as supportSelectors from "../selectors/support"

export default connect(state => ({
  enabled: !state.support.hideReleases,
  releases: supportSelectors.getNewVersions(state)
}))(({ enabled, releases, dispatch }) => (
  <NewRelease
    enabled={enabled}
    releases={releases}
    onClose={() => dispatch(supportActions.hideReleases())}
    onIgnore={() => dispatch(supportActions.ignoreVersion())}
  />
))
