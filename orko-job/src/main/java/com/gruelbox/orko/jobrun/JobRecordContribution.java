package com.gruelbox.orko.jobrun;

import static com.gruelbox.orko.jobrun.JobRecord.PROCESSED;
import static org.alfasoftware.morf.metadata.SchemaUtils.column;
import static org.alfasoftware.morf.metadata.SchemaUtils.index;
import static org.alfasoftware.morf.metadata.SchemaUtils.table;

import java.util.Collection;

import org.alfasoftware.morf.metadata.DataType;
import org.alfasoftware.morf.metadata.Table;
import org.alfasoftware.morf.upgrade.TableContribution;
import org.alfasoftware.morf.upgrade.UpgradeStep;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.ImmutableList;
import com.google.inject.Singleton;
import com.gruelbox.orko.db.EntityContribution;

@Singleton
class JobRecordContribution implements TableContribution, EntityContribution {

  @Override
  public Collection<Table> tables() {
    return tablesStatic();
  }

  @VisibleForTesting
  static Collection<Table> tablesStatic() {
    return ImmutableList.of(
      table("Job")
        .columns(
          column("id", DataType.STRING, 45).primaryKey(),
          column("content", DataType.CLOB).nullable(),
          column("processed", DataType.BOOLEAN)
        )
        .indexes(
          index("Job_1").columns(PROCESSED)
        )
    );
  }

  @Override
  public Collection<Class<? extends UpgradeStep>> schemaUpgradeClassses() {
    return ImmutableList.of();
  }

  @Override
  public Iterable<Class<?>> getEntities() {
    return ImmutableList.of(JobRecord.class);
  }
}