import { useState } from 'react';
import { PanelScreen } from '../components/PanelScreen';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { RoundButton } from '../components/RoundButton';
import { useHorizontalDragScroll } from '../hooks/useHorizontalDragScroll';
import { useRankingQuery } from '../query/useRankingQuery';
import { useHistoryQuery } from '../query/useHistoryQuery';
import { getLocalPlayer } from '../api/player';
import type { MatchConfigKey } from '../api/types';
import { formatDuration } from '../utils/formatDuration';
import icon_turn_left from '../assets/png/default/ui/controls/icon_turn_left.png';
import icon_turn_right from '../assets/png/default/ui/controls/icon_turn_right.png';
import icon_score from '../assets/png/default/ui/hud/icon_score.png';

type LogTab = 'ranking' | 'history';

interface RankingScreenProps {
  initialTab: LogTab;
  config: MatchConfigKey;
  onBack: () => void;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }).toUpperCase();
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
}

export function RankingScreen({ initialTab, config, onBack }: RankingScreenProps) {
  const [tab, setTab] = useState<LogTab>(initialTab);
  const [page, setPage] = useState(1);
  const [player] = useState(() => getLocalPlayer());
  const { ref: tableScrollRef, isDragging, handlers: tableScrollHandlers } = useHorizontalDragScroll<HTMLDivElement>();

  const rankingQuery = useRankingQuery(config, page, player.id);
  const historyQuery = useHistoryQuery(player.id, page);

  const selectTab = (nextTab: LogTab) => {
    setTab(nextTab);
    setPage(1);
  };

  const totalPages = tab === 'ranking' ? (rankingQuery.data?.totalPages ?? 1) : (historyQuery.data?.totalPages ?? 1);
  const isBackgroundRefreshing =
    tab === 'ranking' ? rankingQuery.isFetching && !rankingQuery.isLoading : historyQuery.isFetching && !historyQuery.isLoading;

  return (
    <PanelScreen panelSize="wide">
      <h1 className="options-title">CAPTAIN'S LOG</h1>
      <div className="log-tabs">
        {tab === 'ranking' ? (
          <PrimaryButton label="RANKING" onClick={() => selectTab('ranking')} />
        ) : (
          <SecondaryButton label="RANKING" onClick={() => selectTab('ranking')} />
        )}
        {tab === 'history' ? (
          <PrimaryButton label="MATCH HISTORY" onClick={() => selectTab('history')} />
        ) : (
          <SecondaryButton label="MATCH HISTORY" onClick={() => selectTab('history')} />
        )}
      </div>
      <p className="log-subtitle">
        {config.matchDurationSeconds} second battles · {config.enemySpawnIntervalSeconds} second spawn interval
        {isBackgroundRefreshing ? ' · updating…' : ''}
      </p>

      <div
        className={isDragging ? 'log-table-wrapper dragging' : 'log-table-wrapper'}
        ref={tableScrollRef}
        {...tableScrollHandlers}
      >
        {tab === 'ranking' ? (
          rankingQuery.isLoading ? (
            <p className="log-status">Loading ranking…</p>
          ) : rankingQuery.isError ? (
            <div className="log-status log-status-error">
              <p>Couldn&apos;t load the ranking.</p>
              <SecondaryButton label="RETRY" onClick={() => rankingQuery.refetch()} />
            </div>
          ) : rankingQuery.data && rankingQuery.data.items.length === 0 ? (
            <p className="log-status">No ranked battles yet for this configuration.</p>
          ) : (
            <table className="log-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Captain</th>
                  <th>Points</th>
                  <th>Played</th>
                </tr>
              </thead>
              <tbody>
                {rankingQuery.data?.items.map((entry) => (
                  <tr key={entry.matchId} className={entry.isYou ? 'you' : ''}>
                    <td className="log-cell-strong">{String(entry.rank).padStart(2, '0')}</td>
                    <td className="log-cell-strong">
                      {entry.rank === 1 ? <img className="rank-star" src={icon_score} alt="" /> : null}
                      {entry.playerName}
                      {entry.isYou ? <span className="you-tag">YOU</span> : null}
                    </td>
                    <td className="log-cell-strong">{entry.score}</td>
                    <td>{formatDateTime(entry.playedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : historyQuery.isLoading ? (
          <p className="log-status">Loading match history…</p>
        ) : historyQuery.isError ? (
          <div className="log-status log-status-error">
            <p>Couldn&apos;t load your match history.</p>
            <SecondaryButton label="RETRY" onClick={() => historyQuery.refetch()} />
          </div>
        ) : historyQuery.data && historyQuery.data.items.length === 0 ? (
          <p className="log-status">You haven&apos;t completed a battle yet.</p>
        ) : (
          <table className="log-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Points</th>
                <th>Duration</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {historyQuery.data?.items.map((entry) => (
                <tr key={entry.matchId}>
                  <td>{formatDateTime(entry.playedAt)}</td>
                  <td>{entry.score}</td>
                  <td>{formatDuration(entry.durationSeconds)}</td>
                  <td>
                    <span className={entry.endReason === 'time-up' ? 'log-result time-up' : 'log-result defeated'}>
                      {entry.endReason === 'time-up' ? 'TIME UP' : 'DEFEATED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="log-pagination">
        <RoundButton
          icon={icon_turn_left}
          alt="Previous page"
          size="small"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page <= 1}
        />
        <span className="log-pagination-label">
          PAGE {page} OF {totalPages}
        </span>
        <RoundButton
          icon={icon_turn_right}
          alt="Next page"
          size="small"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page >= totalPages}
        />
      </div>

      <PrimaryButton label="MAIN MENU" onClick={onBack} sound="uiBack" />
    </PanelScreen>
  );
}
