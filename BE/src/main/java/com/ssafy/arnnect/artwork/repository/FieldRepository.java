package com.ssafy.arnnect.artwork.repository;

import com.ssafy.arnnect.artwork.domain.entity.ArtField;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FieldRepository extends JpaRepository<ArtField, Integer> {
    List<ArtField> findAll();
}
