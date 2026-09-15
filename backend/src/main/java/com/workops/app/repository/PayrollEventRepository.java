package com.workops.app.repository;

import com.workops.app.entity.PayrollEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayrollEventRepository extends JpaRepository<PayrollEvent, Long> {

    List<PayrollEvent> findAllByOrderByEventDateAsc();
}
