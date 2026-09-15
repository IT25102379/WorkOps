package com.workops.app.repository;

import com.workops.app.entity.GeneratedReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeneratedReportRepository extends JpaRepository<GeneratedReport, Long> {
    List<GeneratedReport> findByModuleOrderByCreatedAtDesc(String module);
    List<GeneratedReport> findAllByOrderByCreatedAtDesc();
}
